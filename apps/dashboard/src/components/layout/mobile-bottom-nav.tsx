"use client";

import { cn, Icons } from "@harmonia/ui";
import {
	DASHBOARD_MOBILE_NAV_ITEMS,
	DASHBOARD_ROUTES,
} from "@harmonia/common/utils/routes";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";

type Href = LinkProps<string>["href"];

export function MobileBottomNav() {
	const pathname = usePathname();

	// Check if the current route is a sub-route of playlists (e.g., /playlists/123)
	// DASHBOARD_ROUTES.playlists.path is "/playlists"
	// We check if it starts with "/playlists/" which implies a nested route
	const isPlaylistDetail =
		pathname.startsWith(`${DASHBOARD_ROUTES.playlists.path}/`) &&
		DASHBOARD_ROUTES.playlists.children.detail.hideBottomNav;

	if (isPlaylistDetail) {
		return null;
	}

	return (
		<div className="fixed bottom-0 left-0 z-50 w-full border-t bg-background/80 backdrop-blur-lg md:hidden">
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
										? "text-primary font-medium"
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
