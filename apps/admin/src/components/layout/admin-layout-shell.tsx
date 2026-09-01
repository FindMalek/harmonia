"use client";

import { SidebarInset, SidebarProvider } from "@sonaraem/ui";

import { AdminSidebar } from "./admin-sidebar";

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider>
			<AdminSidebar />
			<SidebarInset>
				<div className="flex flex-1 flex-col p-6">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
