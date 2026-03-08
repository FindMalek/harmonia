import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/get-server-session";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

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
		<div className="grid h-svh grid-rows-[auto_1fr]">
			<div className="flex h-full flex-col gap-0 overflow-hidden">
				<div className="flex-1 overflow-auto p-4 pb-20 md:pb-4">{children}</div>
			</div>
			<MobileBottomNav />
		</div>
	);
}
