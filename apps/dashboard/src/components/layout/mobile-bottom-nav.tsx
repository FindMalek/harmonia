"use client";

import { cn, Icons } from "@harmonia/ui";
import {
	DASHBOARD_MOBILE_NAV_ITEMS,
	DASHBOARD_ROUTES,
} from "@harmonia/common/utils/routes";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";

type Href = LinkProps<string>["href"];

// Helper to check if a route matches the current pathname
function isRouteMatch(routePath: string, currentPathname: string) {
	if (routePath === currentPathname) return true;

	// If route has dynamic segments (e.g. /playlists/:id)
	if (routePath.includes(":")) {
		const routeSegments = routePath.split("/");
		const pathSegments = currentPathname.split("/");

		// Length must match
		if (routeSegments.length !== pathSegments.length) return false;

		// Check each segment
		return routeSegments.every((segment, i) => {
			// If segment starts with ":", it's a wildcard, so it matches anything
			return segment.startsWith(":") || segment === pathSegments[i];
		});
	}

	return false;
}

export function MobileBottomNav() {
	const pathname = usePathname();

	// Check if the current route or any of its children should hide the bottom nav
	const shouldHideNav = Object.values(DASHBOARD_ROUTES).some((route) => {
		// Check main route
		if (route.hideBottomNav && isRouteMatch(route.path, pathname)) return true;

		// Check children (if any)
		if (route.children) {
			return Object.values(route.children).some(
				(child) => child.hideBottomNav && isRouteMatch(child.path, pathname),
			);
		}

		return false;
	});

	if (shouldHideNav) {
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
