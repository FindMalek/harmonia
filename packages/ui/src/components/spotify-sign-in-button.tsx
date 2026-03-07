"use client";

import type { AuthClientForUI } from "../types/auth";
import { Button } from "./ui/button";

type SpotifySignInButtonProps = {
	authClient: AuthClientForUI;
	spotifyEnabled?: boolean;
	callbackURL?: string;
};

export function SpotifySignInButton({
	authClient,
	spotifyEnabled = true,
	callbackURL = "/dashboard",
}: SpotifySignInButtonProps) {
	if (!spotifyEnabled) return null;

	return (
		<Button
			type="button"
			variant="outline"
			className="w-full"
			onClick={() => {
				authClient.signIn.social({
					provider: "spotify",
					callbackURL,
				});
			}}
		>
			Sign in with Spotify
		</Button>
	);
}
