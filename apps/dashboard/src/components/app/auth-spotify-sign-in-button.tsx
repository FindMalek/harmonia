"use client";

import { authClient } from "@/shared/api/auth-client";
import { env } from "@/lib/env";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { Button, Icons } from "@harmonia/ui";
import { useState } from "react";

export function AuthSpotifySignInButton() {
	const [isLoading, setIsLoading] = useState(false);

	const handleSpotifySignIn = async () => {
		setIsLoading(true);
		try {
			await authClient.signIn.social({
				provider: "spotify",
				callbackURL: `${env.NEXT_PUBLIC_HARMONIA_DASHBOARD_URL}${DASHBOARD_ROUTES.overview.path}`,
			});
		} catch (error) {
			setIsLoading(false);
			console.error("Failed to sign in with Spotify", error);
		}
	};
	return (
		<Button
			type="button"
			size="xl"
			className="w-full uppercase"
			isLoading={isLoading}
			disabled={isLoading}
			onClick={handleSpotifySignIn}
		>
			{isLoading ? "Connecting..." : "Continue with Spotify"}
			{!isLoading && <Icons.chevronRight className="h-4 w-4" />}
		</Button>
	);
}
