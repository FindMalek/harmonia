"use client";

import { ADMIN_NAV_ITEMS } from "@harmonia/common/utils/routes";
import { cn } from "@harmonia/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { authClient } from "@/shared/api/auth-client";

export function AdminSidebar() {
	const pathname = usePathname();
	const router = useRouter();

	async function handleSignOut() {
		await authClient.signOut();
		router.push("/login");
	}

	return (
		<aside className="flex w-56 shrink-0 flex-col border-r bg-muted/30">
			<div className="border-b px-4 py-4">
				<span className="font-semibold text-sm tracking-tight">
					Harmonia Admin
				</span>
			</div>

			<nav className="flex-1 space-y-1 p-2">
				{ADMIN_NAV_ITEMS.map((item) => {
					const isActive =
						item.path === "/"
							? pathname === "/"
							: pathname.startsWith(item.path);
					return (
						<Link
							key={item.key}
							href={item.path as "/"}
							className={cn(
								"flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
								isActive
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
						>
							{item.label}
						</Link>
					);
				})}
			</nav>

			<div className="border-t p-2">
				<button
					type="button"
					onClick={handleSignOut}
					className="w-full rounded-md px-3 py-2 text-left text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
				>
					Sign out
				</button>
			</div>
		</aside>
	);
}
