import { Card, CardContent, CardHeader, CardTitle, Icons } from "@harmonia/ui";
import { redirect } from "next/navigation";

import { AdminSetupForm } from "@/components/app/admin-setup-form";
import { adminAccountExists } from "@/shared/api/admin-exists.server";

export default async function SetupPage() {
	// Permanently a dead end once the one admin account exists — enforced for
	// real by the database (user_single_admin_idx), this is just the redirect.
	if (await adminAccountExists()) {
		redirect("/login");
	}

	return (
		<div className="flex min-h-svh items-center justify-center bg-sidebar p-4">
			<div className="w-full max-w-sm space-y-6">
				<div className="flex flex-col items-center gap-2 text-center">
					<div className="flex size-9 items-center justify-center bg-primary text-primary-foreground">
						<Icons.logo className="size-5" />
					</div>
					<div>
						<h1 className="font-semibold text-lg tracking-tight">
							Create the admin account
						</h1>
						<p className="text-muted-foreground text-xs">
							This can only be done once — there is no way to register another
							admin account after this.
						</p>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Set up Harmonia Admin</CardTitle>
					</CardHeader>
					<CardContent>
						<AdminSetupForm />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
