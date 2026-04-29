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
	Gauge,
} from "lucide-react";
import { repositoryApi, type RepositoryFilters } from "../services/api";
import { cn, formatRelativeTime } from "../lib/utils";
import { useScan } from "../context/ScanContext";
import { useSocket } from "../context/SocketContext";
import { AvatarGroup } from "../components/Avatar";
import { Select } from "../components/Select";
import { useOrganizationScan } from "../hooks/useOrganizationScan";

export function Repositories() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [search, setSearch] = useState(searchParams.get("search") || "");
	const queryClient = useQueryClient();
	const { scan } = useScan();
	const { socket } = useSocket();
	const scanMutation = useOrganizationScan();

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
			newParams.set(
				"sortOrder",
				field === "healthScore" ? "desc" : "asc",
			);
		}

		newParams.set("page", "1");
		setSearchParams(newParams);
	};

	const showHealthColumn =
		!isLoading && Boolean(data?.data.some((r) => r.healthScore !== undefined));

	const tableColCount = showHealthColumn ? 8 : 7;

	const showEmptyState =
		!isLoading &&
		data?.pagination.total === 0 &&
		!scan.isScanning &&
		!filters.search &&
		filters.adopted === "all" &&
		filters.hasOutdated === "all";

	return (
		<div className="space-y-6 relative">
			{/* Empty State Overlay - No data in database */}
			{showEmptyState && (
				<div className="fixed inset-0 bg-white/80 backdrop-blur-md z-40 flex items-center justify-center">
					<div className="text-center max-w-md px-6">
						<div className="mb-6">
							<GitBranch className="w-20 h-20 text-neutral-300 mx-auto mb-4" />
							<h2 className="text-2xl font-bold text-neutral-700 mb-2">
								No Repositories Yet
							</h2>
							<p className="text-neutral-600 mb-6">
								Start by scanning your organization to discover repositories and
								their Renovate Bot adoption status.
							</p>
						</div>
						<button
							type="button"
							onClick={() => scanMutation.mutate()}
							disabled={scanMutation.isPending || scan.isScanning}
							className={cn(
								"px-6 py-3 text-lg font-semibold shadow-lg transition-all",
								scanMutation.isPending || scan.isScanning
									? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
									: "btn-primary hover:shadow-xl",
							)}
						>
							<Zap
								className={cn(
									"w-5 h-5 mr-2 inline",
									(scanMutation.isPending || scan.isScanning) && "animate-pulse",
								)}
							/>
							{scanMutation.isPending || scan.isScanning ? "Scanning..." : "Start Scan"}
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
					<h1 className="text-2xl font-bold text-neutral-700">Repositories</h1>
					<p className="text-neutral-500 mt-1">
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
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
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
					<table className="min-w-full divide-y divide-neutral-200">
						<thead className="bg-neutral-50">
							<tr>
								<th className="px-2.5 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
									<button
										onClick={() => toggleSort("name")}
										className="flex items-center gap-1 hover:text-neutral-700 transition-colors"
									>
										Repository
										<ArrowUpDown className="w-4 h-4" />
									</button>
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
									<button
										onClick={() => toggleSort("renovateAdopted")}
										className="flex items-center gap-1 hover:text-neutral-700 transition-colors"
									>
										Renovate
										<ArrowUpDown className="w-4 h-4" />
									</button>
								</th>
								{showHealthColumn && (
									<th className="px-2.5 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
										<button
											type="button"
											onClick={() => toggleSort("healthScore")}
											className="flex items-center gap-1 hover:text-neutral-700 transition-colors"
										>
											<Gauge className="w-3.5 h-3.5" />
											Health
											<ArrowUpDown className="w-4 h-4" />
										</button>
									</th>
								)}
								<th className="px-2.5 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
									<button
										onClick={() => toggleSort("outdatedDependencies")}
										className="flex items-center gap-1 hover:text-neutral-700 transition-colors"
									>
										Open PRs / Dependencies
										<ArrowUpDown className="w-4 h-4" />
									</button>
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
									<button
										type="button"
										onClick={() => toggleSort("lastScanAt")}
										className="flex items-center gap-1 hover:text-neutral-700 transition-colors"
									>
										Last Scan
										<ArrowUpDown className="w-4 h-4" />
									</button>
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
									Contributors
								</th>
								<th className="px-2.5 py-2"></th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-neutral-200">
							{isLoading ? (
								[...Array(5)].map((_, i) => (
									<tr key={`loading-${i}`}>
										<td colSpan={tableColCount} className="px-2.5 py-0.5">
											<div className="h-8 bg-neutral-100 rounded-hds-sm animate-pulse" />
										</td>
									</tr>
								))
							) : data?.data.length === 0 ? (
								<tr>
									<td
										colSpan={tableColCount}
										className="px-2.5 py-4 text-center text-neutral-500"
									>
										No repositories found
									</td>
								</tr>
							) : (
								data?.data.map((repo) => (
									<tr
										key={repo.id}
										className="hover:bg-neutral-100 transition-colors"
									>
										<td className="px-2.5 py-0.5 text-xs">
											<div className="flex items-center gap-2">
												<GitBranch className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
												<div>
													<Link
														to={`/repositories/${repo.id}`}
														className="font-medium hover:text-action-300"
													>
														{repo.name}
													</Link>
													{repo.description && (
														<p className="text-xs text-neutral-500 truncate max-w-xs">
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
										{showHealthColumn && (
											<td className="px-2.5 py-0.5 whitespace-nowrap">
												{repo.healthScore !== undefined ? (
													<span
														className={cn(
															"inline-flex items-center justify-center min-w-[2.25rem] px-1.5 py-0.5 rounded-hds-sm text-xs font-bold tabular-nums",
															repo.healthScore >= 80 &&
																"bg-success-50 text-success-300",
															repo.healthScore >= 50 &&
																repo.healthScore < 80 &&
																"bg-warning-50 text-warning-300",
															repo.healthScore < 50 &&
																"bg-critical-50 text-critical-300",
														)}
													>
														{repo.healthScore}
													</span>
												) : (
													<span className="text-xs text-neutral-400">—</span>
												)}
											</td>
										)}
										<td className="px-2.5 py-0.5 whitespace-nowrap">
											<div className="flex flex-col gap-0.5">
												<span className="text-xs font-semibold text-action-300">
													{repo.openRenovatePRs} open PRs
												</span>
												<span className="text-xs text-warning-300">
													{repo.outdatedDependencies} dependencies
												</span>
											</div>
										</td>
										<td className="px-2.5 py-0.5 whitespace-nowrap text-xs text-neutral-500">
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
												<span className="text-xs text-neutral-500">
													No data
												</span>
											)}
										</td>
										<td className="px-2.5 py-0.5 whitespace-nowrap">
											<a
												href={repo.htmlUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="text-neutral-400 hover:text-action-300 transition-colors p-0.5"
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
					<div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200">
						<p className="text-sm text-neutral-500">
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
							<span className="text-sm text-neutral-600">
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
