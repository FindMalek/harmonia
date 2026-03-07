"use client";

import { useState } from "react";
import { Icons } from "@harmonia/ui";

import { authClient } from "@/lib/auth-client";
import { env } from "@/lib/env";
import { Button } from "@harmonia/ui";

export default function LoginPageClient() {
	const [isLoading, setIsLoading] = useState(false);

	const callbackURL =
		(env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "") ||
			(typeof window !== "undefined" ? window.location.origin : "")) +
		"/dashboard";

	const handleSpotifySignIn = async () => {
		setIsLoading(true);
		try {
			await authClient.signIn.social({
				provider: "spotify",
				callbackURL,
			});
		} catch (error) {
			setIsLoading(false);
			console.error("Failed to sign in with Spotify", error);
		}
	};

	return (
		<div className="flex h-full min-h-svh flex-col bg-background font-sans">
			{/* Top Hero Section */}
			<div className="flex flex-1 flex-col justify-between p-8 sm:p-12 lg:p-16">
				{/* Logo Header */}
				<div className="flex items-center gap-3">
					<Icons.logo className="h-4 w-4 text-foreground" />
					<span className="text-sm font-bold tracking-widest text-foreground">
						HARMONIA
					</span>
				</div>

				{/* Hero Text */}
				<div className="mt-42 mb-16 max-w-2xl border-l-4 border-foreground pl-6 sm:pl-8">
					<h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
						AI-powered
						<br />
						organization for your
						<br />
						Spotify music library.
					</h1>
				</div>

				<div className="flex-1" />
			</div>

			<div className="border-t border-border bg-card px-8 py-10 sm:px-12 sm:py-12 lg:px-16">
				<div className="mx-auto max-w-2xl lg:mx-0">
					<div className="flex flex-col gap-8">
						<div className="flex flex-col gap-3">
							<h2 className="text-lg font-semibold text-foreground">
								Connect your Spotify account
							</h2>
							<p className="max-w-md text-sm leading-relaxed text-muted-foreground">
								Harmonia analyzes your music library and automatically creates
								intelligent playlists based on your music taste.
							</p>
						</div>

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

						{/* Footer Privacy Note */}
						{/* Changed text-[13px] to text-sm */}
						<p className="text-xs text-muted-foreground">
							Harmonia only reads your playlists and liked songs.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
