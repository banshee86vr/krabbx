import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Bell,
	Mail,
	MessageSquare,
	Plus,
	Trash2,
	TestTube,
	CheckCircle,
	XCircle,
	Settings,
} from "lucide-react";
import { notificationApi } from "../services/api";
import { useNotifications } from "../context/NotificationContext";
import { useSocket } from "../context/SocketContext";
import { cn, formatDateTime } from "../lib/utils";
import type { NotificationTrigger } from "../types";

const triggerLabels: Record<NotificationTrigger, string> = {
	critical: "Critical Updates",
	newAdoption: "New Adoptions",
	stalePR: "Stale PRs",
	scanComplete: "Scan Complete",
};

const typeIcons = {
	teams: MessageSquare,
	email: Mail,
	inApp: Bell,
};

export function Notifications() {
	const [showAddForm, setShowAddForm] = useState(false);
	const [activeTab, setActiveTab] = useState<"config" | "history" | "inapp">(
		"config",
	);
	const queryClient = useQueryClient();
	const { socket } = useSocket();
	const {
		notifications: inAppNotifications,
		markAllAsRead,
		clearAll,
	} = useNotifications();

	const { data: configs, isLoading } = useQuery({
		queryKey: ["notifications", "config"],
		queryFn: notificationApi.getConfigs,
	});

	const { data: history } = useQuery({
		queryKey: ["notifications", "history"],
		queryFn: () => notificationApi.getHistory(),
	});

	// Listen for real-time WebSocket updates
	useEffect(() => {
		if (!socket) return;

		const handleUpdate = () => {
			queryClient.invalidateQueries({ queryKey: ["notifications", "history"] });
		};

		socket.on("notification", handleUpdate);
		socket.on("scan:complete", handleUpdate);

		return () => {
			socket.off("notification", handleUpdate);
			socket.off("scan:complete", handleUpdate);
		};
	}, [socket, queryClient]);

	const deleteMutation = useMutation({
		mutationFn: notificationApi.deleteConfig,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications", "config"] });
		},
	});

	const testMutation = useMutation({
		mutationFn: notificationApi.test,
	});

	const toggleMutation = useMutation({
		mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
			notificationApi.updateConfig(id, { enabled }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications", "config"] });
		},
	});

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-neutral-700">
						Notifications
					</h1>
					<p className="text-neutral-500 mt-1">
						Configure how you receive updates
					</p>
				</div>
				<button
					onClick={() => setShowAddForm(true)}
					className="btn-primary flex items-center gap-2"
				>
					<Plus className="w-4 h-4" />
					Add Channel
				</button>
			</div>

			{/* Tabs */}
			<div className="border-b border-neutral-200">
				<nav className="flex gap-8">
					{[
						{ id: "config", label: "Channels", icon: Settings },
						{
							id: "inapp",
							label: "In-App",
							icon: Bell,
							count: inAppNotifications.filter((n) => !n.read).length,
						},
						{ id: "history", label: "History", icon: Mail },
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id as typeof activeTab)}
							className={cn(
								"flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors",
								activeTab === tab.id
									? "border-action-300 text-action-300"
									: "border-transparent text-neutral-500 hover:text-neutral-700",
							)}
						>
							<tab.icon className="w-4 h-4" />
							{tab.label}
							{tab.count !== undefined && tab.count > 0 && (
								<span className="px-2 py-0.5 text-xs bg-critical-50 text-critical-300 rounded-full">
									{tab.count}
								</span>
							)}
						</button>
					))}
				</nav>
			</div>

			{/* Configuration Tab */}
			{activeTab === "config" && (
				<div className="space-y-4">
					{isLoading ? (
						[...Array(3)].map((_, i) => (
							<div key={i} className="card p-6 h-32 animate-pulse" />
						))
					) : configs?.length === 0 ? (
						<div className="card p-12 text-center">
							<Bell className="w-12 h-12 text-neutral-300 mx-auto" />
							<h3 className="mt-4 text-lg font-medium text-neutral-700">
								No notification channels
							</h3>
							<p className="mt-2 text-neutral-500">
								Get started by adding a notification channel.
							</p>
							<button
								onClick={() => setShowAddForm(true)}
								className="mt-4 btn-primary"
							>
								Add Channel
							</button>
						</div>
					) : (
						configs?.map((config) => {
							const Icon = typeIcons[config.type];
							return (
								<div key={config.id} className="card p-6">
									<div className="flex items-start justify-between">
										<div className="flex items-start gap-4">
											<div
												className={cn(
													"p-3 rounded-hds-lg",
													config.enabled
														? "bg-action-50"
														: "bg-neutral-100",
												)}
											>
												<Icon
													className={cn(
														"w-6 h-6",
														config.enabled
															? "text-action-300"
															: "text-neutral-400",
													)}
												/>
											</div>
											<div>
												<div className="flex items-center gap-2">
													<h3 className="font-semibold text-neutral-700">
														{config.name}
													</h3>
													<span
														className={cn(
															"badge",
															config.enabled
																? "badge-success"
																: "badge-neutral",
														)}
													>
														{config.enabled ? "Active" : "Disabled"}
													</span>
												</div>
												<p className="text-sm text-neutral-500 mt-1">
													{config.type === "teams" && "Microsoft Teams webhook"}
													{config.type === "email" &&
														`Email to ${(config.config.recipients || []).length} recipients`}
													{config.type === "inApp" && "In-app notifications"}
												</p>
												<div className="flex flex-wrap gap-2 mt-3">
													{config.triggers.map((trigger) => (
														<span key={trigger} className="badge-info">
															{triggerLabels[trigger]}
														</span>
													))}
												</div>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<button
												onClick={() => testMutation.mutate(config.type)}
												disabled={testMutation.isPending || !config.enabled}
												className="btn-ghost p-2"
												title="Send test notification"
											>
												<TestTube className="w-4 h-4" />
											</button>
											<button
												onClick={() =>
													toggleMutation.mutate({
														id: config.id,
														enabled: !config.enabled,
													})
												}
												className="btn-ghost p-2"
												title={config.enabled ? "Disable" : "Enable"}
											>
												{config.enabled ? (
													<CheckCircle className="w-4 h-4 text-success-300" />
												) : (
													<XCircle className="w-4 h-4 text-neutral-400" />
												)}
											</button>
											<button
												onClick={() => deleteMutation.mutate(config.id)}
												className="btn-ghost p-2 text-critical-300 hover:bg-critical-50"
												title="Delete"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>
			)}

			{/* In-App Tab */}
			{activeTab === "inapp" && (
				<div className="card">
					<div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
						<h3 className="font-medium text-neutral-700">
							Recent Notifications
						</h3>
						<div className="flex gap-2">
							<button
								onClick={markAllAsRead}
								className="text-sm text-action-300 hover:text-action-400"
							>
								Mark all read
							</button>
							<button
								onClick={clearAll}
								className="text-sm text-neutral-500 hover:text-neutral-700"
							>
								Clear all
							</button>
						</div>
					</div>
					<div className="divide-y divide-neutral-100">
						{inAppNotifications.length === 0 ? (
							<p className="px-6 py-8 text-center text-neutral-500">
								No notifications yet
							</p>
						) : (
							inAppNotifications.map((notification) => (
								<div
									key={notification.id}
									className={cn(
										"px-6 py-4",
										!notification.read && "bg-action-50",
									)}
								>
									<div className="flex items-start justify-between">
										<div>
											<p className="font-medium text-neutral-700">
												{notification.subject}
											</p>
											<p className="text-sm text-neutral-500 mt-1">
												{notification.content}
											</p>
										</div>
										<span className="text-xs text-neutral-400">
											{formatDateTime(notification.timestamp)}
										</span>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			)}

			{/* History Tab */}
			{activeTab === "history" && (
				<div className="card overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-neutral-200">
							<thead className="bg-neutral-50">
								<tr>
									<th className="px-2.5 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
										Type
									</th>
									<th className="px-2.5 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
										Trigger
									</th>
									<th className="px-2.5 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
										Subject
									</th>
									<th className="px-2.5 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
										Status
									</th>
									<th className="px-2.5 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">
										Sent At
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-neutral-200">
								{history?.data.length === 0 ? (
									<tr>
										<td
											colSpan={5}
											className="px-2.5 py-4 text-center text-neutral-500"
										>
											No notification history
										</td>
									</tr>
								) : (
									history?.data.map((item) => {
										const Icon = typeIcons[item.type];
										return (
											<tr
												key={item.id}
												className="hover:bg-neutral-100 transition-colors"
											>
												<td className="px-2.5 py-0.5 text-xs">
													<div className="flex items-center gap-1.5">
														<Icon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
														<span className="capitalize text-neutral-700">
															{item.type}
														</span>
													</div>
												</td>
												<td className="px-2.5 py-0.5 whitespace-nowrap text-xs">
													<span className="badge-info">
														{triggerLabels[item.trigger]}
													</span>
												</td>
												<td className="px-2.5 py-0.5 text-xs text-neutral-700">
													{item.subject}
												</td>
												<td className="px-2.5 py-0.5 whitespace-nowrap">
													{item.status === "sent" ? (
														<span className="badge-success">Sent</span>
													) : (
														<span className="badge-danger">Failed</span>
													)}
												</td>
												<td className="px-2.5 py-0.5 whitespace-nowrap text-xs text-neutral-500">
													{formatDateTime(item.sentAt)}
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Add Form Modal */}
			{showAddForm && (
				<AddNotificationModal onClose={() => setShowAddForm(false)} />
			)}
		</div>
	);
}

function AddNotificationModal({ onClose }: { onClose: () => void }) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState({
		type: "teams" as "teams" | "email" | "inApp",
		name: "",
		webhookUrl: "",
		recipients: "",
		triggers: [] as NotificationTrigger[],
	});

	const createMutation = useMutation({
		mutationFn: notificationApi.createConfig,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications", "config"] });
			onClose();
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		createMutation.mutate({
			type: form.type,
			name: form.name,
			enabled: true,
			config: {
				webhookUrl: form.type === "teams" ? form.webhookUrl : undefined,
				recipients:
					form.type === "email"
						? form.recipients.split(",").map((r) => r.trim())
						: undefined,
			},
			triggers: form.triggers,
		});
	};

	const toggleTrigger = (trigger: NotificationTrigger) => {
		setForm((prev) => ({
			...prev,
			triggers: prev.triggers.includes(trigger)
				? prev.triggers.filter((t) => t !== trigger)
				: [...prev.triggers, trigger],
		}));
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
			<div className="bg-white rounded-hds-xl shadow-xl w-full max-w-md animate-fadeIn border border-neutral-200">
				<div className="px-6 py-4 border-b border-neutral-200">
					<h2 className="text-lg font-semibold text-neutral-700">
						Add Notification Channel
					</h2>
				</div>
				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-neutral-600 mb-1">
							Channel Type
						</label>
						<select
							value={form.type}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									type: e.target.value as typeof form.type,
								}))
							}
							className="input"
						>
							<option value="teams">Microsoft Teams</option>
							<option value="email">Email</option>
							<option value="inApp">In-App</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-neutral-600 mb-1">
							Name
						</label>
						<input
							type="text"
							value={form.name}
							onChange={(e) =>
								setForm((prev) => ({ ...prev, name: e.target.value }))
							}
							placeholder="e.g., DevOps Team"
							className="input"
							required
						/>
					</div>

					{form.type === "teams" && (
						<div>
							<label className="block text-sm font-medium text-neutral-600 mb-1">
								Webhook URL
							</label>
							<input
								type="url"
								value={form.webhookUrl}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, webhookUrl: e.target.value }))
								}
								placeholder="https://outlook.office.com/webhook/..."
								className="input"
								required
							/>
						</div>
					)}

					{form.type === "email" && (
						<div>
							<label className="block text-sm font-medium text-neutral-600 mb-1">
								Recipients
							</label>
							<input
								type="text"
								value={form.recipients}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, recipients: e.target.value }))
								}
								placeholder="email1@example.com, email2@example.com"
								className="input"
								required
							/>
							<p className="text-xs text-neutral-500 mt-1">
								Comma-separated email addresses
							</p>
						</div>
					)}

					<div>
						<label className="block text-sm font-medium text-neutral-600 mb-2">
							Triggers
						</label>
						<div className="space-y-2">
							{(Object.keys(triggerLabels) as NotificationTrigger[]).map(
								(trigger) => (
									<label
										key={trigger}
										className="flex items-center gap-2 cursor-pointer"
									>
										<input
											type="checkbox"
											checked={form.triggers.includes(trigger)}
											onChange={() => toggleTrigger(trigger)}
											className="rounded border-neutral-300 text-action-300"
										/>
										<span className="text-sm text-neutral-600">
											{triggerLabels[trigger]}
										</span>
									</label>
								),
							)}
						</div>
					</div>

					<div className="flex justify-end gap-3 pt-4">
						<button type="button" onClick={onClose} className="btn-secondary">
							Cancel
						</button>
						<button
							type="submit"
							disabled={createMutation.isPending || form.triggers.length === 0}
							className="btn-primary"
						>
							{createMutation.isPending ? "Creating..." : "Create Channel"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
