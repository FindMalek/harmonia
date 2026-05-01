import { redirect } from "next/navigation";

import { OnboardingFooter } from "@/components/layout/onboarding-footer";
import { Header } from "@/components/shared/header";
import { getServerSession } from "@/lib/get-server-session";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";

export default async function OnboardingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession();

	if (!session?.user) {
		redirect("/login");
	}

	if (session.user.hasCompletedOnboarding) {
		redirect(DASHBOARD_ROUTES.overview.path);
	}

	return (
		<div className="flex h-full min-h-svh flex-col bg-background font-sans">
			<div className="flex flex-1 flex-col justify-between p-8 sm:p-12 lg:p-16">
				<Header />

				<div className="flex flex-1 flex-col justify-center">{children}</div>
				<OnboardingFooter />
			</div>
		</div>
	);
}
