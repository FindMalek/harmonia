"use client";

import { usePipelineStream } from "@/hooks/use-pipeline-stream";
import { useOrganizeStore } from "@/shared/lib/organize/store";
import {
	DASHBOARD_MOBILE_NAV_ITEMS,
	DASHBOARD_ROUTES,
} from "@harmonia/common/utils/routes";
import { Button, Icons, cn } from "@harmonia/ui";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";

type Href = LinkProps<string>["href"];

export function MobileBottomNav() {
	const pathname = usePathname();
	const { activeRunId, isAnalysisDrawerOpen, setIsAnalysisDrawerOpen } =
		useOrganizeStore();
	const streamState = usePipelineStream(activeRunId);

	const isPlaylistDetail =
		pathname.startsWith(`${DASHBOARD_ROUTES.playlists.path}/`) &&
		DASHBOARD_ROUTES.playlists.children.detail.hideBottomNav;

	const showAnalysisBar =
		activeRunId != null &&
		!isAnalysisDrawerOpen &&
		streamState.status === "running";

	if (isPlaylistDetail) {
		return null;
	}

	return (
		<div className="fixed bottom-0 left-0 z-50 w-full border-t bg-background/80 backdrop-blur-lg md:hidden">
			{showAnalysisBar && (
				<div className="flex items-center justify-between gap-2 border-border border-b px-3 py-2">
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Icons.spinner className="h-4 w-4 shrink-0 animate-spin text-primary" />
						<span>Analysis running</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="h-8 shrink-0 text-xs"
						onClick={() => setIsAnalysisDrawerOpen(true)}
					>
						Expand
					</Button>
				</div>
			)}
			<nav className="grid h-16 grid-cols-4">
				{DASHBOARD_MOBILE_NAV_ITEMS.filter((item) => item.isNav).map(
					({ key, path, label, icon }) => {
						const isActive =
							path === "/" ? pathname === "/" : pathname.startsWith(path);

						const Icon = icon ? Icons[icon as keyof typeof Icons] : null;

						return (
							<Link
								key={key}
								href={path as Href}
								className={cn(
									"flex flex-col items-center justify-center gap-1 text-xs transition-colors",
									isActive
										? "font-medium text-primary"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{Icon && <Icon className="size-5" />}
								<span>{label}</span>
							</Link>
						);
					},
				)}
			</nav>
			{/* Safe area padding for newer iPhones */}
			<div className="h-[env(safe-area-inset-bottom)] bg-background/80 backdrop-blur-lg" />
		</div>
	);
}
