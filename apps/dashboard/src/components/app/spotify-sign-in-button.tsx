"use client";

import type { AuthClientForUI } from "@harmonia/ui";
import { Button } from "@harmonia/ui";

type SpotifySignInButtonProps = {
	authClient: AuthClientForUI;
	callbackURL?: string;
};

export function SpotifySignInButton({
	authClient,
	callbackURL = "/dashboard",
}: SpotifySignInButtonProps) {
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
