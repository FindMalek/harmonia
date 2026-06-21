import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { HarmoniaBrandHeader } from "@harmonia/ui";
import { redirect } from "next/navigation";
import { OnboardingFooter } from "@/components/layout/onboarding-footer";
import { getServerSession } from "@/shared/api/session.server";

export default async function OnboardingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession();

	if (!session?.user) {
		redirect("/login");
	}

	// Approval gating happens in middleware.ts before this layout ever renders.

	if (session.user.hasCompletedOnboarding) {
		redirect(DASHBOARD_ROUTES.overview.path);
	}

	return (
		<div className="flex h-full min-h-svh flex-col bg-background font-sans">
			<div className="flex flex-1 flex-col justify-between p-8 sm:p-12 lg:p-16">
				<HarmoniaBrandHeader />

				<div className="flex flex-1 flex-col justify-center">{children}</div>
				<OnboardingFooter />
			</div>
		</div>
	);
}
