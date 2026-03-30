import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	GitBranch,
	ExternalLink,
	CheckCircle,
	XCircle,
	RefreshCw,
	ArrowLeft,
	Package,
	Clock,
	FileJson,
	Zap,
	Code,
	Container,
	Box,
	Settings2,
	Globe,
} from "lucide-react";
import { repositoryApi } from "../services/api";
import {
	cn,
	formatDateTime,
	formatRelativeTime,
	getDependencyTypeColor,
	getDependencyTypeLabel,
	getDependencyTypeIcon,
} from "../lib/utils";
import { useScan } from "../context/ScanContext";

const iconMap: Record<string, React.ReactNode> = {
	Box: <Box className="w-3 h-3" />,
	Settings2: <Settings2 className="w-3 h-3" />,
	Package: <Package className="w-3 h-3" />,
	Globe: <Globe className="w-3 h-3" />,
	GitBranch: <GitBranch className="w-3 h-3" />,
	Container: <Container className="w-3 h-3" />,
	Code: <Code className="w-3 h-3" />,
	Zap: <Zap className="w-3 h-3" />,
};

export function RepositoryDetail() {
	const { id } = useParams<{ id: string }>();
	const queryClient = useQueryClient();
	const { scan } = useScan();

	const { data: repo, isLoading } = useQuery({
		queryKey: ["repository", id],
		queryFn: () => repositoryApi.get(id!),
		enabled: !!id,
	});

	const scanMutation = useMutation({
		mutationFn: () => repositoryApi.scanOne(id!),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["repository", id] });
		},
	});

	if (isLoading) {
		return <RepositoryDetailSkeleton />;
	}

	if (!repo) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-500">Repository not found</p>
				<Link
					to="/repositories"
					className="text-primary-600 hover:text-primary-700 mt-2 inline-block"
				>
					Back to repositories
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Back button */}
			<Link
				to="/repositories"
				className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
			>
				<ArrowLeft className="w-4 h-4" />
				Back to repositories
			</Link>

			{/* Header */}
			<div className="card p-6">
				<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
					<div className="flex items-start gap-4 flex-1">
						<div className="p-3 bg-gray-100 rounded-lg">
							<GitBranch className="w-8 h-8 text-gray-600" />
						</div>
						<div className="flex-1">
							<div className="flex items-center gap-3">
								<h1 className="text-2xl font-bold text-gray-900">
									{repo.name}
								</h1>
								{repo.renovateAdopted ? (
									<span className="badge-success flex items-center gap-1">
										<CheckCircle className="w-3 h-3" />
										Renovate Adopted
									</span>
								) : (
									<span className="badge-neutral flex items-center gap-1">
										<XCircle className="w-3 h-3" />
										Not Adopted
									</span>
								)}
							</div>
							{repo.description && (
								<p className="text-gray-500 mt-1">{repo.description}</p>
							)}
							<div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
								<span className="flex items-center gap-1">
									<Clock className="w-4 h-4" />
									Last scan:{" "}
									{repo.lastScanAt
										? formatRelativeTime(repo.lastScanAt)
										: "Never"}
								</span>
								{repo.renovateConfigPath && (
									<span className="flex items-center gap-1">
										<FileJson className="w-4 h-4" />
										{repo.renovateConfigPath}
									</span>
								)}
							</div>
						</div>
					</div>
					<div className="flex flex-col items-end gap-4">
						<div className="text-right">
							<p className="text-sm text-amber-600 font-medium uppercase tracking-wide">
								Outdated Dependencies
							</p>
							<p className="text-3xl font-bold text-amber-600 mt-1">
								{repo.outdatedDependencies}
							</p>
						</div>
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => scanMutation.mutate()}
								disabled={scanMutation.isPending || scan.isScanning}
								className={cn(
									"flex items-center gap-2 relative overflow-hidden rounded-lg px-4 py-2 font-medium transition-all",
									scanMutation.isPending || scan.isScanning
										? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
										: "btn-secondary",
								)}
							>
								{(scanMutation.isPending || scan.isScanning) && (
									<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite]" />
								)}
								<RefreshCw
									className={cn(
										"w-4 h-4 relative z-10",
										(scanMutation.isPending || scan.isScanning) &&
											"animate-spin",
									)}
								/>
								<span className="relative z-10">
									{scanMutation.isPending || scan.isScanning
										? "Scanning..."
										: "Scan Now"}
								</span>
							</button>
							<a
								href={repo.htmlUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="btn-primary flex items-center gap-2 hover:scale-105"
							>
								<ExternalLink className="w-4 h-4" />
								View on GitHub
							</a>
						</div>
					</div>
				</div>
			</div>

			{/* Open PRs Section */}
			<DependenciesSection repositoryId={id!} />

			{/* Scan History */}
			{repo.scanHistory && repo.scanHistory.length > 0 && (
				<div className="card">
					<div className="px-6 py-4 border-b border-gray-200">
						<h2 className="text-lg font-semibold text-gray-900">
							Scan History
						</h2>
					</div>
					<div className="divide-y divide-gray-100">
						{repo.scanHistory.map((scan) => (
							<div
								key={scan.id}
								className="px-6 py-4 flex items-center justify-between"
							>
								<div className="flex items-center gap-3">
									<div
										className={cn(
											"w-8 h-8 rounded-full flex items-center justify-center",
											scan.status === "completed"
												? "bg-green-100"
												: "bg-gray-100",
										)}
									>
										{scan.status === "completed" ? (
											<CheckCircle className="w-4 h-4 text-green-600" />
										) : (
											<Clock className="w-4 h-4 text-gray-600" />
										)}
									</div>
									<div>
										<p className="font-medium text-gray-900">
											{scan.scanType.charAt(0).toUpperCase() +
												scan.scanType.slice(1)}{" "}
											Scan
										</p>
										<p className="text-sm text-gray-500">
											{scan.newUpdatesFound} new updates found
											{scan.durationMs &&
												` • ${(scan.durationMs / 1000).toFixed(1)}s`}
										</p>
									</div>
								</div>
								<span className="text-sm text-gray-400">
									{formatDateTime(scan.createdAt)}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

interface PRData {
	number: number;
	title: string;
	html_url: string;
	state: string;
	packageName: string | null;
	dependencyType: string | null;
	currentVersion: string | null;
	latestVersion: string | null;
	updateType: string | null;
}

interface PRsResponse {
	data: PRData[];
	total: number;
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

function DependenciesSection({ repositoryId }: { repositoryId: string }) {
	// PRs are sorted by the backend:
	// 1. Update type priority (major > minor > patch > digest > pin > rollback > bump)
	// 2. Dependency type (alphabetical)
	// 3. Package name (alphabetical)
	const {
		data: prsData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["dependencies", "prs", repositoryId],
		queryFn: async (): Promise<PRsResponse> => {
			const response = await fetch(`/api/dependencies/prs/${repositoryId}`);
			if (!response.ok) {
				throw new Error(`Failed to fetch PRs: ${response.statusText}`);
			}
			return response.json();
		},
		enabled: !!repositoryId,
		retry: 1,
	});

	if (error) {
		console.error("Error fetching PRs:", error);
	}

	return (
		<div className="card">
			<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
				<h2 className="text-lg font-semibold text-gray-900">
					Open Renovate PRs
				</h2>
				{prsData && (
					<span className="text-sm text-gray-500">
						{prsData.total} PR{prsData.total !== 1 ? "s" : ""}
					</span>
				)}
			</div>
			{isLoading ? (
				<div className="px-6 py-8">
					<div className="animate-pulse space-y-4">
						<div key="skeleton-1" className="h-12 bg-gray-100 rounded" />
						<div key="skeleton-2" className="h-12 bg-gray-100 rounded" />
						<div key="skeleton-3" className="h-12 bg-gray-100 rounded" />
						<div key="skeleton-4" className="h-12 bg-gray-100 rounded" />
						<div key="skeleton-5" className="h-12 bg-gray-100 rounded" />
					</div>
				</div>
			) : prsData?.data && prsData.data.length > 0 ? (
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-500/20">
						<thead className="bg-gray-50 dark:bg-slate-800/50">
							<tr>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
									PR #
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300 min-w-[200px]">
									Dependency
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300">
									Type
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
									Old Version
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
									New Version
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
									Update
								</th>
								<th className="px-2.5 py-2"></th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-900/30 dark:divide-slate-700/50">
							{prsData.data.map((pr: PRData) => (
								<tr
									key={`pr-${pr.number}`}
									className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
								>
									<td className="px-2.5 py-0.5 whitespace-nowrap text-xs">
										<a
											href={pr.html_url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
										>
											#{pr.number}
										</a>
									</td>
									<td className="px-2.5 py-0.5 text-xs">
										<div className="flex items-center gap-1.5">
											<Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
											<span className="font-medium dark:text-slate-100">
												{pr.packageName || "—"}
											</span>
										</div>
									</td>
									<td className="px-2.5 py-0.5 whitespace-nowrap text-xs">
										{pr.dependencyType ? (
											<span
												className={`${getDependencyTypeColor(pr.dependencyType)} flex items-center gap-1 w-fit`}
											>
												{iconMap[getDependencyTypeIcon(pr.dependencyType)]}
												<span className="text-xs">
													{getDependencyTypeLabel(pr.dependencyType)}
												</span>
											</span>
										) : (
											<span className="text-gray-400">—</span>
										)}
									</td>
									<td className="px-2.5 py-0.5 whitespace-nowrap">
										<span className="font-mono text-xs text-gray-600 dark:text-gray-400">
											{pr.currentVersion || "—"}
										</span>
									</td>
									<td className="px-2.5 py-0.5 whitespace-nowrap">
										<span className="font-mono text-xs text-gray-600 dark:text-gray-400">
											{pr.latestVersion || "—"}
										</span>
									</td>
									<td className="px-2.5 py-0.5 whitespace-nowrap">
										{pr.updateType ? (
											<span
												className={cn(
													"badge text-xs",
													pr.updateType === "major" && "badge-danger",
													pr.updateType === "minor" && "badge-warning",
													pr.updateType === "patch" && "badge-success",
													(pr.updateType === "digest" ||
														pr.updateType === "pin") &&
														"badge-info",
												)}
											>
												{pr.updateType}
											</span>
										) : (
											<span className="text-gray-400">—</span>
										)}
									</td>
									<td className="px-2.5 py-0.5 whitespace-nowrap">
										<a
											href={pr.html_url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors p-0.5"
											title={`View PR #${pr.number}`}
										>
											<ExternalLink className="w-3.5 h-3.5" />
										</a>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : error ? (
				<p className="px-6 py-8 text-center text-red-500">
					Error loading open PRs:{" "}
					{error instanceof Error ? error.message : "Unknown error"}
				</p>
			) : (
				<p className="px-6 py-8 text-center text-gray-500">
					No open Renovate PRs found
				</p>
			)}
		</div>
	);
}

function RepositoryDetailSkeleton() {
	return (
		<div className="space-y-6 animate-pulse">
			<div className="h-6 bg-gray-200 rounded w-32" />
			<div className="card p-6 h-40" />
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="card p-4 h-20" />
			</div>
			<div className="card h-96" />
		</div>
	);
}
