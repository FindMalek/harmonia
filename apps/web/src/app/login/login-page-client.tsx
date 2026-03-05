"use client";

import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import SpotifySignInButton from "@/components/spotify-sign-in-button";

export default function LoginPageClient({
	spotifyEnabled = false,
}: { spotifyEnabled?: boolean }) {
	const [showSignIn, setShowSignIn] = useState(false);

	return (
		<div className="mx-auto w-full max-w-md">
			{spotifyEnabled && (
				<div className="mb-6 flex flex-col items-center gap-2">
					<SpotifySignInButton spotifyEnabled={spotifyEnabled} />
					<p className="text-muted-foreground text-sm">
						or continue with email
					</p>
				</div>
			)}
			{showSignIn ? (
				<SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
			) : (
				<SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
			)}
		</div>
	);
}
