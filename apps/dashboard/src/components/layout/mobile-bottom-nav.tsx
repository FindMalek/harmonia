"use client";

import { DASHBOARD_MOBILE_NAV_ITEMS } from "@sonaraem/common/utils/routes";
import {
	Button,
	cn,
	Icons,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@sonaraem/ui";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { useMobileBottomNavState } from "@/hooks/use-mobile-bottom-nav-state";
import { useOrganizeStore } from "@/shared/lib/organize/store";

type Href = LinkProps<string>["href"];

export function MobileBottomNav() {
	const pathname = usePathname();
	const { setIsAnalysisDrawerOpen } = useOrganizeStore();
	const { hidden, showAnalysisBar } = useMobileBottomNavState();

	if (hidden) {
		return null;
	}

	return (
		<div className="fixed bottom-0 left-0 z-50 w-full border-t bg-background/80 backdrop-blur-lg md:hidden">
			{showAnalysisBar && (
				<div className="flex min-h-11 items-center justify-between gap-2 border-border border-b px-3 py-2">
					<div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-muted-foreground text-sm">
						<Icons.spinner className="h-4 w-4 shrink-0 animate-spin text-primary" />
						<span>Analysis running</span>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="size-11 shrink-0"
						aria-label="Expand analysis drawer"
						onClick={() => setIsAnalysisDrawerOpen(true)}
					>
						<Icons.chevronUp className="size-5" aria-hidden />
					</Button>
				</div>
			)}
			<nav className="grid min-h-13 grid-cols-4" aria-label="Dashboard">
				{DASHBOARD_MOBILE_NAV_ITEMS.filter((item) => item.isNav).map(
					({ key, path, icon, ariaLabel }) => {
						const isActive =
							path === "/" ? pathname === "/" : pathname.startsWith(path);

						const Icon = icon ? Icons[icon as keyof typeof Icons] : null;

						return (
							<Tooltip key={key}>
								<TooltipTrigger asChild>
									<Link
										href={path as Href}
										aria-label={ariaLabel}
										aria-current={isActive ? "page" : undefined}
										className={cn(
											"relative flex min-h-11 min-w-11 flex-col items-center justify-center border-transparent border-b-2 pb-0.5 outline-none transition-colors",
											"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
											isActive
												? "border-b-primary text-primary"
												: "text-muted-foreground hover:text-foreground",
										)}
									>
										{Icon ? (
											<Icon className="size-6 shrink-0" aria-hidden />
										) : null}
									</Link>
								</TooltipTrigger>
								<TooltipContent side="top" sideOffset={6}>
									{ariaLabel}
								</TooltipContent>
							</Tooltip>
						);
					},
				)}
			</nav>
			<div className="h-[env(safe-area-inset-bottom)] bg-background/80 backdrop-blur-lg" />
		</div>
	);
}
