import { DASHBOARD_ROUTES } from "@sonaraem/common/utils/routes";
import { SonaraemBrandHeader } from "@sonaraem/ui";
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

	// Approval gating happens in proxy.ts before this layout ever renders.

	if (session.user.hasCompletedOnboarding) {
		redirect(DASHBOARD_ROUTES.overview.path);
	}

	return (
		<div className="flex h-full min-h-svh flex-col bg-background font-sans">
			<div className="flex flex-1 flex-col justify-between p-8 sm:p-12 lg:p-16">
				<SonaraemBrandHeader />

				<div className="flex flex-1 flex-col justify-center">{children}</div>
				<OnboardingFooter />
			</div>
		</div>
	);
}
