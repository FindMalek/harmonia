import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/get-server-session";

export default async function TodosLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession();

	if (!session?.user) {
		redirect("/login");
	}

	return <>{children}</>;
}
