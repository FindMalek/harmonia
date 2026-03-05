"use client";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";

export default function SpotifySignInButton({
	spotifyEnabled,
}: { spotifyEnabled: boolean }) {
	if (!spotifyEnabled) return null;

	return (
		<Button
			type="button"
			variant="outline"
			className="w-full"
			onClick={() => {
				authClient.signIn.social({
					provider: "spotify",
					callbackURL: "/dashboard",
				});
			}}
		>
			Sign in with Spotify
		</Button>
	);
}
