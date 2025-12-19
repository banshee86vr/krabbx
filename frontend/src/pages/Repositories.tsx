import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
	Search,
	GitBranch,
	ExternalLink,
	CheckCircle,
	XCircle,
	ChevronLeft,
	ChevronRight,
	ArrowUpDown,
	Zap,
} from "lucide-react";
import { repositoryApi, type RepositoryFilters } from "../services/api";
import { cn, formatRelativeTime } from "../lib/utils";
import { useScan } from "../context/ScanContext";
import { useSocket } from "../context/SocketContext";
import { AvatarGroup } from "../components/Avatar";
import { Select } from "../components/Select";

export function Repositories() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [search, setSearch] = useState(searchParams.get("search") || "");
	const queryClient = useQueryClient();
	const { scan } = useScan();
	const { socket } = useSocket();

	const filters: RepositoryFilters = {
		page: parseInt(searchParams.get("page") || "1"),
		limit: 20,
		adopted: (searchParams.get("adopted") as "true" | "false" | "all") || "all",
		hasOutdated:
			(searchParams.get("hasOutdated") as "true" | "false" | "all") || "all",
		search: searchParams.get("search") || undefined,
		sortBy:
			(searchParams.get("sortBy") as RepositoryFilters["sortBy"]) ||
			"outdatedDependencies",
		sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
	};

	const { data, isLoading } = useQuery({
		queryKey: ["repositories", filters],
		queryFn: () => repositoryApi.list(filters),
	});

	// Listen for real-time WebSocket updates
	useEffect(() => {
		if (!socket) return;

		const handleRepositoryUpdate = () => {
			queryClient.invalidateQueries({ queryKey: ["repositories"] });
		};

		socket.on("repository:updated", handleRepositoryUpdate);
		socket.on("repo:scanned", handleRepositoryUpdate);
		socket.on("scan:complete", handleRepositoryUpdate);

		return () => {
			socket.off("repository:updated", handleRepositoryUpdate);
			socket.off("repo:scanned", handleRepositoryUpdate);
			socket.off("scan:complete", handleRepositoryUpdate);
		};
	}, [socket, queryClient]);

	// Keep the polling during active scan as fallback
	useEffect(() => {
		if (scan.isScanning && socket) {
			// Refetch repositories every 500ms while scanning as fallback
			const interval = setInterval(() => {
				queryClient.invalidateQueries({ queryKey: ["repositories"] });
			}, 500);
			return () => clearInterval(interval);
		}
	}, [scan.isScanning, socket, queryClient]);

	const updateFilter = (key: string, value: string) => {
		const newParams = new URLSearchParams(searchParams);
		if (value && value !== "all") {
			newParams.set(key, value);
		} else {
			newParams.delete(key);
		}
		if (key !== "page") {
			newParams.set("page", "1");
		}
		setSearchParams(newParams);
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		updateFilter("search", search);
	};

	const toggleSort = (field: string) => {
		const newParams = new URLSearchParams(searchParams);

		if (filters.sortBy === field) {
			// If already sorting by this field, toggle order: asc -> desc -> remove sort
			if (filters.sortOrder === "asc") {
				newParams.set("sortOrder", "desc");
			} else {
				// Remove sort by deleting the parameters
				newParams.delete("sortBy");
				newParams.delete("sortOrder");
			}
		} else {
			// Change sort field to new one with ascending order
			newParams.set("sortBy", field);
			newParams.set("sortOrder", "asc");
		}

		newParams.set("page", "1");
		setSearchParams(newParams);
	};

	const showEmptyState =
		!isLoading &&
		data?.pagination.total === 0 &&
		!scan.isScanning &&
		!filters.search &&
		filters.adopted === "all" &&
		filters.hasOutdated === "all";

	const handleStartScan = async () => {
		try {
			await repositoryApi.scan();
		} catch (error) {
			console.error("Failed to start scan:", error);
		}
	};

	return (
		<div className="space-y-6 relative">
			{/* Empty State Overlay - No data in database */}
			{showEmptyState && (
				<div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-40 flex items-center justify-center">
					<div className="text-center max-w-md px-6">
						<div className="mb-6">
							<GitBranch className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
							<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
								No Repositories Yet
							</h2>
							<p className="text-gray-600 dark:text-gray-400 mb-6">
								Start by scanning your organization to discover repositories and
								their Renovate Bot adoption status.
							</p>
						</div>
						<button
							type="button"
							onClick={handleStartScan}
							disabled={scan.isScanning}
							className={cn(
								"px-6 py-3 text-lg font-semibold shadow-lg transition-all",
								scan.isScanning
									? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
									: "btn-primary hover:shadow-xl",
							)}
						>
							<Zap
								className={cn(
									"w-5 h-5 mr-2 inline",
									scan.isScanning && "animate-pulse",
								)}
							/>
							{scan.isScanning ? "Scanning..." : "Start Scan"}
						</button>
					</div>
				</div>
			)}

			{/* Page Header */}
			<div
				className={cn(
					"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
					(scan.isScanning || showEmptyState) &&
						"pointer-events-none opacity-50 blur-sm",
				)}
			>
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Repositories</h1>
					<p className="text-gray-500 mt-1">
						{data?.pagination.total || 0} repositories in your organization
					</p>
				</div>
			</div>

			{/* Filters */}
			<div
				className={cn(
					"card p-4",
					(scan.isScanning || showEmptyState) &&
						"pointer-events-none opacity-50 blur-sm",
				)}
			>
				<div className="flex flex-col lg:flex-row gap-4">
					{/* Search */}
					<form onSubmit={handleSearch} className="flex-1">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
							<input
								type="text"
								placeholder="Search repositories..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="input pl-10"
							/>
						</div>
					</form>

					{/* Filter dropdowns */}
					<div className="flex flex-wrap gap-3">
						<Select
							options={[
								{ value: "all", label: "All adoption status" },
								{ value: "true", label: "Renovate adopted" },
								{ value: "false", label: "Not adopted" },
							]}
							value={filters.adopted || "all"}
							onChange={(value) => updateFilter("adopted", value)}
							className="w-48"
						/>

						<Select
							options={[
								{ value: "all", label: "All repositories" },
								{ value: "true", label: "Has outdated" },
								{ value: "false", label: "No outdated" },
							]}
							value={filters.hasOutdated || "all"}
							onChange={(value) => updateFilter("hasOutdated", value)}
							className="w-48"
						/>
					</div>
				</div>
			</div>

			{/* Table */}
			<div
				className={cn(
					"card overflow-hidden",
					(scan.isScanning || showEmptyState) &&
						"pointer-events-none opacity-50 blur-sm",
				)}
			>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-500/20">
						<thead className="bg-gray-50 dark:bg-slate-800/50">
							<tr>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300">
									<button
										onClick={() => toggleSort("name")}
										className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
									>
										Repository
										<ArrowUpDown className="w-4 h-4" />
									</button>
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300">
									<button
										onClick={() => toggleSort("renovateAdopted")}
										className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
									>
										Renovate
										<ArrowUpDown className="w-4 h-4" />
									</button>
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
									<button
										onClick={() => toggleSort("outdatedDependencies")}
										className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
									>
										Open PRs / Dependencies
										<ArrowUpDown className="w-4 h-4" />
									</button>
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
									<button
										type="button"
										onClick={() => toggleSort("lastScanAt")}
										className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
									>
										Last Scan
										<ArrowUpDown className="w-4 h-4" />
									</button>
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300">
									Contributors
								</th>
								<th className="px-2.5 py-2"></th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-900/30 dark:divide-slate-700/50">
							{isLoading ? (
								[...Array(5)].map((_, i) => (
									<tr key={`loading-${i}`}>
										<td colSpan={7} className="px-2.5 py-0.5">
											<div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
										</td>
									</tr>
								))
							) : data?.data.length === 0 ? (
								<tr>
									<td
										colSpan={7}
										className="px-2.5 py-4 text-center text-gray-500 dark:text-gray-400"
									>
										No repositories found
									</td>
								</tr>
							) : (
								data?.data.map((repo) => (
									<tr
										key={repo.id}
										className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
									>
										<td className="px-2.5 py-0.5 text-xs">
											<div className="flex items-center gap-2">
												<GitBranch className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
												<div>
													<Link
														to={`/repositories/${repo.id}`}
														className="font-medium dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400"
													>
														{repo.name}
													</Link>
													{repo.description && (
														<p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
															{repo.description}
														</p>
													)}
												</div>
											</div>
										</td>
										<td className="px-2.5 py-0.5 whitespace-nowrap">
											{repo.renovateAdopted ? (
												<span className="badge-success flex items-center gap-1 w-fit text-xs">
													<CheckCircle className="w-3 h-3" />
													Adopted
												</span>
											) : (
												<span className="badge-neutral flex items-center gap-1 w-fit text-xs">
													<XCircle className="w-3 h-3" />
													Not adopted
												</span>
											)}
										</td>
										<td className="px-2.5 py-0.5 whitespace-nowrap">
											<div className="flex flex-col gap-0.5">
												<span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
													{repo.openRenovatePRs} open PRs
												</span>
												<span className="text-xs text-amber-600 dark:text-amber-400">
													{repo.outdatedDependencies} dependencies
												</span>
											</div>
										</td>
										<td className="px-2.5 py-0.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
											{repo.lastScanAt
												? formatRelativeTime(repo.lastScanAt)
												: "Never"}
										</td>
										<td className="px-2.5 py-0.5">
											{repo.contributors && repo.contributors.length > 0 ? (
												<AvatarGroup
													contributors={repo.contributors}
													max={4}
													size="sm"
												/>
											) : (
												<span className="text-xs text-gray-400 dark:text-gray-500">
													No data
												</span>
											)}
										</td>
										<td className="px-2.5 py-0.5 whitespace-nowrap">
											<a
												href={repo.htmlUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors p-0.5"
											>
												<ExternalLink className="w-3.5 h-3.5" />
											</a>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{data && data.pagination.totalPages > 1 && (
					<div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
						<p className="text-sm text-gray-500">
							Showing {(data.pagination.page - 1) * data.pagination.limit + 1}{" "}
							to{" "}
							{Math.min(
								data.pagination.page * data.pagination.limit,
								data.pagination.total,
							)}{" "}
							of {data.pagination.total} results
						</p>
						<div className="flex items-center gap-2">
							<button
								onClick={() =>
									updateFilter("page", String(data.pagination.page - 1))
								}
								disabled={data.pagination.page === 1}
								className="btn-secondary p-2 disabled:opacity-50"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							<span className="text-sm text-gray-600">
								Page {data.pagination.page} of {data.pagination.totalPages}
							</span>
							<button
								onClick={() =>
									updateFilter("page", String(data.pagination.page + 1))
								}
								disabled={data.pagination.page === data.pagination.totalPages}
								className="btn-secondary p-2 disabled:opacity-50"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
