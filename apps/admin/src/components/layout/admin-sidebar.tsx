"use client";

import { ADMIN_NAV_ITEMS } from "@harmonia/common/utils/routes";
import {
	Icons,
	ModeToggle,
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@harmonia/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { authClient } from "@/shared/api/auth-client";

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
	home: Icons.home,
	users: Icons.users,
	person: Icons.user,
};

export function AdminSidebar() {
	const pathname = usePathname();
	const router = useRouter();

	async function handleSignOut() {
		await authClient.signOut();
		router.push("/login");
	}

	return (
		<Sidebar collapsible="none" className="h-svh sticky top-0">
			<SidebarHeader className="h-14 justify-center border-b">
				<div className="flex items-center gap-2.5 px-2">
					<div className="flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground">
						<Icons.logo className="size-4" />
					</div>
					<div className="leading-none">
						<p className="font-semibold text-sm">Harmonia</p>
						<p className="text-muted-foreground text-[10px]">Admin Panel</p>
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{ADMIN_NAV_ITEMS.map((item) => {
								const Icon = NAV_ICONS[item.icon] ?? Icons.home;
								const isActive =
									item.path === "/"
										? pathname === "/"
										: pathname.startsWith(item.path);
								return (
									<SidebarMenuItem key={item.key}>
										<SidebarMenuButton asChild isActive={isActive}>
											<Link href={item.path as "/"}>
												<Icon />
												<span>{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarSeparator />

			<SidebarFooter>
				<div className="flex items-center justify-between px-2 py-1">
					<ModeToggle variant="immediate" />
					<button
						type="button"
						onClick={handleSignOut}
						className="flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
					>
						<Icons.logout className="size-3.5" />
						Sign out
					</button>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
