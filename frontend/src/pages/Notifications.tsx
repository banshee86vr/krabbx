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
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
						Notifications
					</h1>
					<p className="text-gray-500 dark:text-gray-400 mt-1">
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
			<div className="border-b border-gray-200 dark:border-gray-700">
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
									? "border-primary-500 text-primary-600 dark:text-primary-400"
									: "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300",
							)}
						>
							<tab.icon className="w-4 h-4" />
							{tab.label}
							{tab.count !== undefined && tab.count > 0 && (
								<span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full dark:bg-red-900/40 dark:text-red-300 dark:border dark:border-red-500/50">
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
							<Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
							<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
								No notification channels
							</h3>
							<p className="mt-2 text-gray-500 dark:text-gray-400">
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
													"p-3 rounded-lg",
													config.enabled
														? "bg-primary-100 dark:bg-primary-900/40"
														: "bg-gray-100 dark:bg-gray-800",
												)}
											>
												<Icon
													className={cn(
														"w-6 h-6",
														config.enabled
															? "text-primary-600 dark:text-primary-400"
															: "text-gray-400 dark:text-gray-500",
													)}
												/>
											</div>
											<div>
												<div className="flex items-center gap-2">
													<h3 className="font-semibold text-gray-900 dark:text-gray-100">
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
												<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
													<CheckCircle className="w-4 h-4 text-green-600" />
												) : (
													<XCircle className="w-4 h-4 text-gray-400" />
												)}
											</button>
											<button
												onClick={() => deleteMutation.mutate(config.id)}
												className="btn-ghost p-2 text-red-600 hover:bg-red-50"
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
					<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<h3 className="font-medium text-gray-900 dark:text-gray-100">
							Recent Notifications
						</h3>
						<div className="flex gap-2">
							<button
								onClick={markAllAsRead}
								className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
							>
								Mark all read
							</button>
							<button
								onClick={clearAll}
								className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
							>
								Clear all
							</button>
						</div>
					</div>
					<div className="divide-y divide-gray-100 dark:divide-gray-700">
						{inAppNotifications.length === 0 ? (
							<p className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
								No notifications yet
							</p>
						) : (
							inAppNotifications.map((notification) => (
								<div
									key={notification.id}
									className={cn(
										"px-6 py-4",
										!notification.read &&
											"bg-blue-50 dark:bg-blue-900/20 dark:border-l-2 dark:border-l-blue-500/50",
									)}
								>
									<div className="flex items-start justify-between">
										<div>
											<p className="font-medium text-gray-900 dark:text-gray-100">
												{notification.subject}
											</p>
											<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
												{notification.content}
											</p>
										</div>
										<span className="text-xs text-gray-400 dark:text-gray-500">
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
						<table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-500/20">
							<thead className="bg-gray-50 dark:bg-slate-800/50">
								<tr>
									<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300">
										Type
									</th>
									<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300">
										Trigger
									</th>
									<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300">
										Subject
									</th>
									<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300">
										Status
									</th>
									<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
										Sent At
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-900/30 dark:divide-slate-700/50">
								{history?.data.length === 0 ? (
									<tr>
										<td
											colSpan={5}
											className="px-2.5 py-4 text-center text-gray-500 dark:text-gray-400"
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
												className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
											>
												<td className="px-2.5 py-0.5 text-xs">
													<div className="flex items-center gap-1.5">
														<Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
														<span className="capitalize dark:text-slate-100">
															{item.type}
														</span>
													</div>
												</td>
												<td className="px-2.5 py-0.5 whitespace-nowrap text-xs">
													<span className="badge-info">
														{triggerLabels[item.trigger]}
													</span>
												</td>
												<td className="px-2.5 py-0.5 text-xs dark:text-slate-100">
													{item.subject}
												</td>
												<td className="px-2.5 py-0.5 whitespace-nowrap">
													{item.status === "sent" ? (
														<span className="badge-success">Sent</span>
													) : (
														<span className="badge-danger">Failed</span>
													)}
												</td>
												<td className="px-2.5 py-0.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
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
			<div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md animate-fadeIn border dark:border-secondary-500/30">
				<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
						Add Notification Channel
					</h2>
				</div>
				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Comma-separated email addresses
							</p>
						</div>
					)}

					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
											className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
										/>
										<span className="text-sm text-gray-700 dark:text-gray-300">
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
