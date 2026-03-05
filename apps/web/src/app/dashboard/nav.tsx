"use client";

import { cn } from "@/lib/utils";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";

type Href = LinkProps<string>["href"];

const navItems: Array<{ href: string; label: string }> = [
	{ href: "/dashboard", label: "Overview" },
	{ href: "/dashboard/pipeline", label: "Pipeline" },
	{ href: "/dashboard/tracks", label: "Tracks" },
	{ href: "/dashboard/clusters", label: "Clusters" },
	{ href: "/dashboard/playlists", label: "Playlists" },
];

export function DashboardNav() {
	const pathname = usePathname();

	return (
		<nav className="mt-2 flex gap-1">
			{navItems.map(({ href, label }) => {
				const isActive =
					href === "/dashboard"
						? pathname === "/dashboard"
						: pathname.startsWith(href);

				return (
					<Link
						key={href}
						href={href as Href}
						className={cn(
							"px-3 py-1.5 font-medium text-xs transition-colors",
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
