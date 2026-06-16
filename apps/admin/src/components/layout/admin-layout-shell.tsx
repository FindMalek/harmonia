import { AdminSidebar } from "./admin-sidebar";

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-svh overflow-hidden bg-background">
			<AdminSidebar />
			<main className="flex-1 overflow-auto p-6">{children}</main>
		</div>
	);
}
