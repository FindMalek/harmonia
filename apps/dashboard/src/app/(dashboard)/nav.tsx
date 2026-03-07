"use client";

import { cn, Icons } from "@harmonia/ui";
import { DASHBOARD_NAV_ITEMS } from "@harmonia/common/utils/routes";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";

type Href = LinkProps<string>["href"];

export function DashboardNav() {
	const pathname = usePathname();

	return (
		<nav className="mt-2 flex gap-1 overflow-x-auto pb-1 scrollbar-none sm:overflow-visible sm:pb-0">
			{DASHBOARD_NAV_ITEMS.map(({ key, path, label, icon }) => {
				const isActive =
					path === "/" ? pathname === "/" : pathname.startsWith(path);
				const Icon = icon ? Icons[icon as keyof typeof Icons] : null;

				return (
					<Link
						key={key}
						href={path as Href}
						className={cn(
							"shrink-0 px-3 py-1.5 font-medium text-xs transition-colors duration-200",
							isActive
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						<div className="flex items-center gap-2">
							{Icon && <Icon className="size-3.5 shrink-0" />}
							{label}
						</div>
					</Link>
				);
			})}
		</nav>
	);
}
