import { auth } from "@harmonia/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function TodosLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/login");
	}

	return <>{children}</>;
}
