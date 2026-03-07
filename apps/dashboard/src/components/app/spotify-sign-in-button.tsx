"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, Icons } from "@harmonia/ui";
import { env } from "@/lib/env";

export function SpotifySignInButton() {
	const [isLoading, setIsLoading] = useState(false);

	const handleSpotifySignIn = async () => {
		setIsLoading(true);
		try {
			await authClient.signIn.social({
				provider: "spotify",
				callbackURL: env.NEXT_PUBLIC_DASHBOARD_URL,
			});
		} catch (error) {
			setIsLoading(false);
			console.error("Failed to sign in with Spotify", error);
		}
	};
	return (
		<Button
			type="button"
			size="lg"
			isLoading={isLoading}
			disabled={isLoading}
			className="w-full h-14 font-bold"
			onClick={handleSpotifySignIn}
		>
			{isLoading ? "CONNECTING..." : "CONTINUE WITH SPOTIFY"}
			{!isLoading && <Icons.chevronRight className="h-4 w-4" />}
		</Button>
	);
}
