import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/get-server-session";
import { DashboardOverview } from "./overview";

export default async function DashboardPage() {
	const session = await getServerSession();

	if (!session?.user) {
		redirect("/login");
	}

	return <DashboardOverview />;
}
