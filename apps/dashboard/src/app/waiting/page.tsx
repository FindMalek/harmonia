import { HarmoniaBrandHeader } from "@harmonia/ui";
import { redirect } from "next/navigation";
import { getServerSession } from "@/shared/api/session.server";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import type { Route } from "next";

export default async function WaitingPage() {
	const session = await getServerSession();

	// Already approved — send them where they belong
	if (session?.user?.isApproved) {
		if (session.user.hasCompletedOnboarding) {
			redirect(DASHBOARD_ROUTES.overview.path);
		}
		redirect(DASHBOARD_ROUTES.onboarding.introduction.path as Route);
	}

	return (
		<div className="flex h-full min-h-svh flex-col bg-background font-sans">
			<div className="flex flex-1 flex-col justify-between p-8 sm:p-12 lg:p-16">
				<HarmoniaBrandHeader />

				<div className="mt-42 mb-16 max-w-2xl border-foreground border-l-4 pl-6 sm:pl-8">
					<h1 className="font-semibold text-3xl text-foreground leading-tight tracking-tight sm:text-5xl md:text-6xl">
						You're on
						<br />
						the waitlist.
					</h1>
					<p className="mt-6 text-muted-foreground text-base leading-relaxed">
						We'll send you an email as soon as your spot is ready. No action
						needed on your end.
					</p>
				</div>

				<div className="flex-1" />
			</div>
		</div>
	);
}
