import { type ReactNode } from "react";
import { Zap } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useSidebar } from "../../context/SidebarContext";
import { useScan } from "../../context/ScanContext";
import { cn } from "../../lib/utils";

interface LayoutProps {
	children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
	const { isCollapsed } = useSidebar();
	const { scan } = useScan();

	return (
		<div className="min-h-screen bg-neutral-50">
			<Header />
			<Sidebar />
			<div
				className={cn(
					"transition-all duration-300 pt-[60px]",
					isCollapsed ? "lg:pl-20" : "lg:pl-64",
				)}
			>
				<main className="p-6">{children}</main>
			</div>

			{scan.isScanning && (
				<>
					<div className="fixed inset-0 bg-neutral-700/20 backdrop-blur-sm z-40" />

					<div
						className="fixed z-50"
						style={{
							top: "50vh",
							left: "50vw",
							transform: "translate(-50%, -50%)",
							width: "min(28rem, calc(100vw - 2rem))",
						}}
					>
						<div className="bg-white rounded-hds-xl p-5 shadow-hds-surface-higher">
							<div className="flex items-center gap-3 mb-3">
								<Zap className="w-5 h-5 text-action-200 animate-pulse" />
								<h3 className="font-semibold text-neutral-700">
									Live Scanning
								</h3>
								<span className="ml-auto text-sm text-neutral-500">
									{scan.scannedCount} of {scan.totalToScan}
								</span>
							</div>
							<p className="text-sm text-neutral-500 mb-3">
								Retrieve repositories data
							</p>
							<div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
								<div
									className="h-full bg-action-200 transition-all duration-300 ease-out rounded-full"
									style={{ width: `${scan.progress}%` }}
								/>
							</div>
							<p className="text-xs text-neutral-500 mt-2">
								{scan.progress}% complete
								{scan.rateLimited && (
									<span className="ml-2">
										• Limited to {scan.totalToScan} of {scan.totalAvailable}{" "}
										repositories
									</span>
								)}
							</p>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
