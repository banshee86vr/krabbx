import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
	Search,
	Package,
	ExternalLink,
	ChevronLeft,
	ChevronRight,
	ArrowUpDown,
	Zap,
	Code,
	Container,
	GitBranch,
	Box,
	Settings2,
	Globe,
} from "lucide-react";
import {
	dependencyApi,
	type DependencyFilters,
} from "../services/api";
import {
	getUpdateTypeColor,
	getDependencyTypeColor,
	getDependencyTypeLabel,
	getDependencyTypeIcon,
	cn,
} from "../lib/utils";
import { useSocket } from "../context/SocketContext";
import { Select } from "../components/Select";
import { useScan } from "../context/ScanContext";
import { useOrganizationScan } from "../hooks/useOrganizationScan";

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

export function Dependencies() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [search, setSearch] = useState(searchParams.get("search") || "");
	const queryClient = useQueryClient();
	const { socket } = useSocket();
	const { scan } = useScan();
	const scanMutation = useOrganizationScan();

	const filters: DependencyFilters = {
		page: parseInt(searchParams.get("page") || "1"),
		limit: 30,
		isOutdated:
			(searchParams.get("isOutdated") as "true" | "false" | "all") || "all",
		updateType:
			(searchParams.get("updateType") as DependencyFilters["updateType"]) ||
			"all",
		search: searchParams.get("search") || undefined,
		sortBy:
			(searchParams.get("sortBy") as DependencyFilters["sortBy"]) ||
			"packageName",
		sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
	};

	const { data, isLoading } = useQuery({
		queryKey: ["dependencies", filters],
		queryFn: () => dependencyApi.list(filters),
	});

	const { data: stats } = useQuery({
		queryKey: ["dependencies", "stats"],
		queryFn: dependencyApi.getStats,
	});

	const showEmptyState =
		!isLoading &&
		data?.pagination.total === 0 &&
		!scan.isScanning &&
		!filters.search &&
		filters.isOutdated === "all" &&
		filters.updateType === "all";

	// Listen for real-time WebSocket updates
	useEffect(() => {
		if (!socket) return;

		const handleUpdate = () => {
			queryClient.invalidateQueries({ queryKey: ["dependencies"] });
			queryClient.invalidateQueries({ queryKey: ["dependencies", "stats"] });
		};

		socket.on("repository:updated", handleUpdate);
		socket.on("repo:scanned", handleUpdate);
		socket.on("scan:complete", handleUpdate);

		return () => {
			socket.off("repository:updated", handleUpdate);
			socket.off("repo:scanned", handleUpdate);
			socket.off("scan:complete", handleUpdate);
		};
	}, [socket, queryClient]);

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
		if (filters.sortBy === field) {
			updateFilter("sortOrder", filters.sortOrder === "asc" ? "desc" : "asc");
		} else {
			updateFilter("sortBy", field);
			updateFilter("sortOrder", "asc");
		}
	};

	return (
		<div className="space-y-6 relative">
			{/* Empty State Overlay - No data in database */}
			{showEmptyState && (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-md z-40 flex items-center justify-center">
					<div className="text-center max-w-md px-6">
						<div className="mb-6">
							<Package className="w-20 h-20 text-neutral-300 mx-auto mb-4" />
							<h2 className="text-2xl font-bold text-neutral-700 mb-2">
								No Dependencies Yet
							</h2>
							<p className="text-neutral-500 mb-6">
								Start by scanning your organization to discover dependencies and
								check for outdated packages.
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

			{/* Page Header with Stats */}
			<div
				className={cn(
					"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
					showEmptyState && "pointer-events-none opacity-50 blur-sm",
				)}
			>
				<div>
					<h1 className="text-2xl font-bold text-neutral-700">
						Dependencies
					</h1>
				</div>

				{/* Stats badges */}
				<div className="flex gap-2">
					<div className="px-3 py-2 rounded-hds-lg bg-warning-50 border border-warning-100">
						<p className="text-xs text-warning-300 font-semibold uppercase tracking-wide leading-none">
							Outdated
						</p>
						<p className="text-lg font-bold text-warning-300 leading-tight mt-0.5">
							{stats?.outdated || 0}
						</p>
					</div>
					<div className="px-3 py-2 rounded-hds-lg bg-action-50 border border-action-100">
						<p className="text-xs text-action-300 font-semibold uppercase tracking-wide leading-none">
							Open PRs
						</p>
						<p className="text-lg font-bold text-action-300 leading-tight mt-0.5">
							{stats?.withOpenPR || 0}
						</p>
					</div>
				</div>
			</div>

			{/* Filters */}
			<div
				className={cn(
					"card p-4",
					showEmptyState && "pointer-events-none opacity-50 blur-sm",
				)}
			>
				<div className="flex flex-col md:flex-row gap-3">
					{/* Search */}
					<form onSubmit={handleSearch} className="flex-1">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
							<input
								type="text"
								placeholder="Search packages..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="input pl-10 w-full"
							/>
						</div>
					</form>

					{/* Filter dropdowns */}
					<div className="flex flex-wrap gap-3">
						<Select
							options={[
								{ value: "all", label: "All dependencies" },
								{ value: "true", label: "Outdated only" },
							]}
							value={filters.isOutdated || "all"}
							onChange={(value) => updateFilter("isOutdated", value)}
							className="w-48"
						/>

						<Select
							options={[
								{ value: "all", label: "All update types" },
								{ value: "major", label: "Major" },
								{ value: "minor", label: "Minor" },
								{ value: "patch", label: "Patch" },
								{ value: "digest", label: "Digest" },
							]}
							value={filters.updateType || "all"}
							onChange={(value) => updateFilter("updateType", value)}
							className="w-48"
						/>
					</div>
				</div>
			</div>

			{/* Table */}
			<div
				className={cn(
					"card overflow-hidden",
					showEmptyState && "pointer-events-none opacity-50 blur-sm",
				)}
			>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-neutral-200">
						<thead className="bg-neutral-50">
							<tr>
								<th className="px-2.5 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
									<button
										onClick={() => toggleSort("packageName")}
										className="flex items-center gap-1 hover:text-neutral-700 transition-colors"
									>
										Package
										<ArrowUpDown className="w-4 h-4" />
									</button>
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
									Repository
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
									Type
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
									Current
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
									Latest
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
									<button
										onClick={() => toggleSort("updateType")}
										className="flex items-center gap-1 hover:text-neutral-700 transition-colors"
									>
										Update Type
										<ArrowUpDown className="w-4 h-4" />
									</button>
								</th>
								<th className="px-2.5 py-2"></th>
							</tr>
						</thead>
						<tbody className="bg-neutral-100 divide-y divide-neutral-200">
							{isLoading ? (
								[...Array(10)].map((_, i) => (
									<tr key={i}>
										<td colSpan={7} className="px-2.5 py-0.5">
											<div className="h-8 bg-neutral-100 rounded animate-pulse" />
										</td>
									</tr>
								))
							) : data?.data.length === 0 ? (
								<tr>
									<td
										colSpan={7}
										className="px-2.5 py-4 text-center text-neutral-500"
									>
										No dependencies found
									</td>
								</tr>
							) : (
								data?.data.map((dep) => (
									<tr
										key={dep.id}
										className="hover:bg-neutral-200 transition-colors"
									>
										<td className="px-2.5 py-0.5 text-xs">
											<div className="flex items-center gap-1.5">
												<Package className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
												<span className="font-medium text-neutral-700">
													{dep.packageName}
												</span>
											</div>
										</td>
										<td className="px-2.5 py-0.5 text-xs">
											{dep.repository && (
												<Link
													to={`/repositories/${dep.repository.id}`}
													className="text-action-200 hover:text-action-300"
												>
													{dep.repository.name}
												</Link>
											)}
										</td>
										<td className="px-2.5 py-0.5 whitespace-nowrap text-xs">
											{dep.dependencyType && (
												<span
													className={`${getDependencyTypeColor(dep.dependencyType)} flex items-center gap-1 w-fit`}
												>
													{iconMap[getDependencyTypeIcon(dep.dependencyType)]}
													<span className="text-xs">
														{getDependencyTypeLabel(dep.dependencyType)}
													</span>
												</span>
											)}
										</td>
										<td className="px-2.5 py-0.5 whitespace-nowrap">
											<span className="font-mono text-xs text-neutral-500">
												{dep.currentVersion}
											</span>
										</td>
										<td className="px-2.5 py-0.5 whitespace-nowrap">
											<span className="font-mono text-xs text-neutral-500">
												{dep.latestVersion || "-"}
											</span>
										</td>
										<td className="px-2.5 py-0.5 whitespace-nowrap">
											{dep.updateType && (
												<span className={getUpdateTypeColor(dep.updateType)}>
													{dep.updateType}
												</span>
											)}
										</td>
										<td className="px-2.5 py-0.5 whitespace-nowrap">
											{dep.prUrl && (
												<a
													href={dep.prUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="text-neutral-400 hover:text-action-300 transition-colors p-0.5"
													title={`View PR #${dep.prNumber}`}
												>
													<ExternalLink className="w-3.5 h-3.5" />
												</a>
											)}
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
							<span className="text-sm text-neutral-500">
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
