"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SignInForm, SignUpForm, SpotifySignInButton } from "@harmonia/ui";
import { authClient } from "@/lib/auth-client";
import { env } from "@/lib/env";

export default function LoginPageClient({
	spotifyEnabled = false,
}: { spotifyEnabled?: boolean }) {
	const router = useRouter();
	const [showSignIn, setShowSignIn] = useState(false);

	const onSuccess = () => router.push("/dashboard");

	const callbackURL =
		(env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "") ||
			(typeof window !== "undefined" ? window.location.origin : "")) +
		"/dashboard";

	return (
		<div className="mx-auto w-full max-w-md">
			{spotifyEnabled && (
				<div className="mb-6 flex flex-col items-center gap-2">
					<SpotifySignInButton
						authClient={authClient}
						spotifyEnabled={spotifyEnabled}
						callbackURL={callbackURL}
					/>
					<p className="text-muted-foreground text-sm">
						or continue with email
					</p>
				</div>
			)}
			{showSignIn ? (
				<SignInForm
					authClient={authClient}
					onSuccess={onSuccess}
					onSwitchToSignUp={() => setShowSignIn(false)}
				/>
			) : (
				<SignUpForm
					authClient={authClient}
					onSuccess={onSuccess}
					onSwitchToSignIn={() => setShowSignIn(true)}
				/>
			)}
		</div>
	);
}
