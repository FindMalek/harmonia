import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/get-server-session";
import { DashboardNav } from "./nav";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession();

	if (!session?.user) {
		redirect("/login");
	}

	return (
		<div className="flex h-full flex-col gap-0">
			<div className="border-b px-4 py-2">
				<div className="flex items-center justify-between">
					<h1 className="font-semibold text-lg">Harmonia</h1>
					<span className="text-muted-foreground text-xs">
						{session.user.name}
					</span>
				</div>
				<DashboardNav />
			</div>
			<div className="flex-1 overflow-auto p-4">{children}</div>
		</div>
	);
}
