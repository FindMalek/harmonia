"use client";

import { DASHBOARD_ROUTES } from "@sonaraem/common/utils/routes";
import { Button, buttonVariants, cn } from "@sonaraem/ui";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { client } from "@/shared/api/orpc";
import { queryKeys } from "@/shared/api/query-keys";
import { useOnboardingController } from "@/shared/lib/onboarding/controller.hook";

export function OnboardingFooter() {
	const router = useRouter();
	const pathname = usePathname();
	const queryClient = useQueryClient();
	const { reset, isSyncing, isComplete, requestStart } =
		useOnboardingController();
	const [isFinalizing, setIsFinalizing] = useState(false);

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
				<Button
					size="xl"
					isLoading={isFinalizing}
					disabled={isFinalizing}
					className="w-full uppercase"
					onClick={async () => {
						setIsFinalizing(true);
						try {
							await client.spotify.finalizeOnboarding({});
							reset();
							await queryClient.invalidateQueries({
								queryKey: queryKeys.spotifyLibraryStats(),
							});
							router.refresh();
							router.replace(DASHBOARD_ROUTES.overview.path);
						} finally {
							setIsFinalizing(false);
						}
					}}
				>
					Continue
				</Button>
			);
		}
		return (
			<Button
				size="xl"
				isLoading={isSyncing}
				disabled={isSyncing}
				className="w-full uppercase"
				onClick={() => requestStart()}
			>
				{isSyncing ? "IMPORTING..." : "IMPORT"}
			</Button>
		);
	}
	return null;
}
