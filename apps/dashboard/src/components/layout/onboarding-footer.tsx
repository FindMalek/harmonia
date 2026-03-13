"use client";

import Link from "next/link";
import { buttonVariants } from "@harmonia/ui";
import { usePathname } from "next/navigation";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { cn } from "@harmonia/ui";

export function OnboardingFooter() {
	const pathname = usePathname();

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
	// Screen 3: Sync -> Show the Progress List instead of a button
	// if (pathname === DASHBOARD_ROUTES.onboarding.sync.path) {
	// 	return <SyncPage />;
	// }
	return null;
}
