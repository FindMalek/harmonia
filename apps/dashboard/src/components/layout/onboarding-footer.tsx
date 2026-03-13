"use client";

import Link from "next/link";
import { Button, buttonVariants, cn } from "@harmonia/ui";
import { usePathname } from "next/navigation";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { useOnboardingSync } from "@/stores/onboarding-sync";

export function OnboardingFooter() {
	const pathname = usePathname();
	const isSyncing = useOnboardingSync((s) => s.isSyncing);
	const isComplete = useOnboardingSync((s) => s.isComplete);

	// Screen 1: Welcome -> Show "Continue"
	if (pathname === DASHBOARD_ROUTES.onboarding.index.path) {
		return (
			<Link
				href={DASHBOARD_ROUTES.onboarding.introduction.path}
				className={cn(buttonVariants({ size: "xl" }), "w-full uppercase")}
			>
				Continue
			</Link>
		);
	}
	// Screen 2: Introduction -> Show "Next"
	if (pathname === DASHBOARD_ROUTES.onboarding.introduction.path) {
		return (
			<Link
				href={DASHBOARD_ROUTES.onboarding.sync.path}
				className={cn(buttonVariants({ size: "xl" }), "w-full uppercase")}
			>
				Next
			</Link>
		);
	}
	// Screen 3: Sync -> Button with sync context
	if (pathname === DASHBOARD_ROUTES.onboarding.sync.path) {
		if (isComplete) {
			return (
				<Link
					href={DASHBOARD_ROUTES.overview.path}
					className={cn(buttonVariants({ size: "xl" }), "w-full uppercase")}
				>
					Continue
				</Link>
			);
		}
		return (
			<Button
				size="xl"
				isLoading={isSyncing}
				disabled={isSyncing}
				className="w-full uppercase"
			>
				{isSyncing ? "IMPORTING..." : "IMPORT"}
			</Button>
		);
	}
	return null;
}
