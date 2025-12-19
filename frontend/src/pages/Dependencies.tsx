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
	Github,
	Box,
	Settings2,
	Globe,
} from "lucide-react";
import {
	dependencyApi,
	repositoryApi,
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

const iconMap: Record<string, React.ReactNode> = {
	Box: <Box className="w-3 h-3" />,
	Settings2: <Settings2 className="w-3 h-3" />,
	Package: <Package className="w-3 h-3" />,
	Globe: <Globe className="w-3 h-3" />,
	Github: <Github className="w-3 h-3" />,
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

	const handleStartScan = async () => {
		try {
			await repositoryApi.scan();
		} catch (error) {
			console.error("Failed to start scan:", error);
		}
	};

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
				<div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-40 flex items-center justify-center">
					<div className="text-center max-w-md px-6">
						<div className="mb-6">
							<Package className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
							<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
								No Dependencies Yet
							</h2>
							<p className="text-gray-600 dark:text-gray-400 mb-6">
								Start by scanning your organization to discover dependencies and
								check for outdated packages.
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

			{/* Page Header with Stats */}
			<div
				className={cn(
					"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
					showEmptyState && "pointer-events-none opacity-50 blur-sm",
				)}
			>
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
						Dependencies
					</h1>
				</div>

				{/* Stats badges */}
				<div className="flex gap-2">
					<div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
						<p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide leading-none">
							Outdated
						</p>
						<p className="text-lg font-bold text-amber-600 dark:text-amber-400 leading-tight mt-0.5">
							{stats?.outdated || 0}
						</p>
					</div>
					<div className="px-3 py-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-lg">
						<p className="text-xs text-primary-600 dark:text-primary-400 font-semibold uppercase tracking-wide leading-none">
							Open PRs
						</p>
						<p className="text-lg font-bold text-primary-600 dark:text-primary-400 leading-tight mt-0.5">
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
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
					<table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-500/20">
						<thead className="bg-gray-50 dark:bg-slate-800/50">
							<tr>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
									<button
										onClick={() => toggleSort("packageName")}
										className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
									>
										Package
										<ArrowUpDown className="w-4 h-4" />
									</button>
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300">
									Repository
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300">
									Type
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
									Current
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
									Latest
								</th>
								<th className="px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
									<button
										onClick={() => toggleSort("updateType")}
										className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
									>
										Update Type
										<ArrowUpDown className="w-4 h-4" />
									</button>
								</th>
								<th className="px-2.5 py-2"></th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-900/30 dark:divide-slate-700/50">
							{isLoading ? (
								[...Array(10)].map((_, i) => (
									<tr key={i}>
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
										No dependencies found
									</td>
								</tr>
							) : (
								data?.data.map((dep) => (
									<tr
										key={dep.id}
										className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
									>
										<td className="px-2.5 py-0.5 text-xs">
											<div className="flex items-center gap-1.5">
												<Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
												<span className="font-medium dark:text-slate-100">
													{dep.packageName}
												</span>
											</div>
										</td>
										<td className="px-2.5 py-0.5 text-xs">
											{dep.repository && (
												<Link
													to={`/repositories/${dep.repository.id}`}
													className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
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
											<span className="font-mono text-xs text-gray-600 dark:text-gray-400">
												{dep.currentVersion}
											</span>
										</td>
										<td className="px-2.5 py-0.5 whitespace-nowrap">
											<span className="font-mono text-xs text-gray-600 dark:text-gray-400">
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
													className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors p-0.5"
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
