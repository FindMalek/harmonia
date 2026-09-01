import { Card, CardContent, CardHeader, CardTitle, Icons } from "@sonaraem/ui";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/app/admin-login-form";
import { adminAccountExists } from "@/shared/api/admin-exists.server";
import { getAdminServerSession } from "@/shared/api/session.server";

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string }>;
}) {
	const session = await getAdminServerSession();

	if (session?.user?.role === "admin") {
		redirect("/");
	}

	if (!(await adminAccountExists())) {
		redirect("/setup");
	}

	const { error } = await searchParams;

	return (
		<div className="flex min-h-svh items-center justify-center bg-sidebar p-4">
			<div className="w-full max-w-sm space-y-6">
				<div className="flex flex-col items-center gap-2 text-center">
					<div className="flex size-9 items-center justify-center bg-primary text-primary-foreground">
						<Icons.logo className="size-5" />
					</div>
					<div>
						<h1 className="font-semibold text-lg tracking-tight">
							Sonaraem Admin
						</h1>
						<p className="text-muted-foreground text-xs">
							Authorised personnel only
						</p>
					</div>
				</div>

				{error === "unauthorized" && (
					<p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-destructive text-xs">
						You do not have permission to access this area.
					</p>
				)}

				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Sign in</CardTitle>
					</CardHeader>
					<CardContent>
						<AdminLoginForm />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
