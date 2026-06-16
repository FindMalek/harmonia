import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/app/admin-login-form";
import { getAdminServerSession } from "@/shared/api/session.server";

export default async function LoginPage() {
	const session = await getAdminServerSession();

	if (session?.user?.role === "admin") {
		redirect("/");
	}

	return (
		<div className="flex min-h-svh items-center justify-center bg-background p-4">
			<div className="w-full max-w-sm space-y-6">
				<div className="space-y-1 text-center">
					<h1 className="font-semibold text-2xl tracking-tight">
						Harmonia Admin
					</h1>
					<p className="text-muted-foreground text-sm">
						Internal dashboard — authorised personnel only
					</p>
				</div>
				<AdminLoginForm />
			</div>
		</div>
	);
}
