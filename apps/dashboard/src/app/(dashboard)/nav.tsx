"use client";

import { cn } from "@harmonia/ui";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";

type Href = LinkProps<string>["href"];

const navItems: Array<{ href: string; label: string }> = [
	{ href: "/", label: "Overview" },
	{ href: "/pipeline", label: "Pipeline" },
	{ href: "/tracks", label: "Tracks" },
	{ href: "/clusters", label: "Clusters" },
	{ href: "/playlists", label: "Playlists" },
	{ href: "/todos", label: "Todos" },
];

export function DashboardNav() {
	const pathname = usePathname();

	return (
		<nav className="mt-2 flex gap-1 overflow-x-auto pb-1 scrollbar-none sm:overflow-visible sm:pb-0">
			{navItems.map(({ href, label }) => {
				const isActive =
					href === "/" ? pathname === "/" : pathname.startsWith(href);

				return (
					<Link
						key={href}
						href={href as Href}
						className={cn(
							"shrink-0 px-3 py-1.5 font-medium text-xs transition-colors duration-200",
							isActive
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						{label}
					</Link>
				);
			})}
		</nav>
	);
}
