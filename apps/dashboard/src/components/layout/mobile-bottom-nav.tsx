"use client";

import { cn, Icons } from "@harmonia/ui";
import {
	DASHBOARD_MOBILE_NAV_ITEMS,
	DASHBOARD_ROUTES,
} from "@harmonia/common/utils/routes";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";

type Href = LinkProps<string>["href"];

// Helper to flatten routes and find the current one
const findCurrentRouteConfig = (pathname: string) => {
	const flattenRoutes = (routes: any): any[] => {
		return Object.values(routes).reduce((acc: any[], route: any) => {
			acc.push(route);
			if (route.children) {
				acc.push(...flattenRoutes(route.children));
			}
			return acc;
		}, []);
	};

	const allRoutes = flattenRoutes(DASHBOARD_ROUTES);

	return allRoutes.find((route) => {
		// Simple matching for static paths
		if (route.path === pathname) return true;

		// For dynamic paths like /playlists/:id, we need a matcher
		// If you don't have 'path-to-regexp', you can use a simple regex for now:
		if (route.path.includes(":")) {
			const regexPath = route.path.replace(/:[^\s/]+/g, "[^/]+");
			return new RegExp(`^${regexPath}$`).test(pathname);
		}

		return false;
	});
};

export function MobileBottomNav() {
	const pathname = usePathname();
	const currentRoute = findCurrentRouteConfig(pathname);

	if (currentRoute?.hideBottomNav) {
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
