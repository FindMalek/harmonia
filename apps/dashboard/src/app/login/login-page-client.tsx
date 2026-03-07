"use client";

import { SpotifySignInButton } from "@/components/app/spotify-sign-in-button";
import { authClient } from "@/lib/auth-client";
import { env } from "@/lib/env";

export default function LoginPageClient() {
	const callbackURL =
		(env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "") ||
			(typeof window !== "undefined" ? window.location.origin : "")) +
		"/dashboard";

	return (
		<div className="mx-auto w-full max-w-md">
			<div className="flex flex-col items-center gap-2">
				<SpotifySignInButton
					authClient={authClient}
					callbackURL={callbackURL}
				/>
			</div>
		</div>
	);
}
