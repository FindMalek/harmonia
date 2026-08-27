import { DASHBOARD_ROUTES } from "@sonaraem/common/utils/routes";
import { SonaraemBrandHeader } from "@sonaraem/ui";
import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthSpotifySignInButton } from "@/components/app/auth-spotify-sign-in-button";
import { getServerSession } from "@/shared/api/session.server";

export default async function LoginPage() {
	const session = await getServerSession();

	if (session?.user) {
		if (!session.user.isApproved) {
			// proxy.ts's middleware never runs on /login, so this is the only place left that can redeem a fresh invite cookie for a returning, already-signed-in user (#281).
			const cookieStore = await cookies();
			if (cookieStore.has("sonaraem_invite")) {
				redirect("/api/redeem-invite" as Route);
			}
			redirect("/waiting" as Route);
		}
		if (!session.user.hasCompletedOnboarding) {
			redirect(DASHBOARD_ROUTES.onboarding.introduction.path as Route);
		} else {
			redirect(DASHBOARD_ROUTES.overview.path);
		}
	}

	return (
		<div className="flex h-full min-h-svh flex-col bg-background font-sans">
			<div className="flex flex-1 flex-col justify-between p-8 sm:p-12 lg:p-16">
				<SonaraemBrandHeader />

				{/* Hero Text */}
				<div className="mt-42 mb-16 max-w-2xl border-foreground border-l-4 pl-6 sm:pl-8">
					<h1 className="font-semibold text-3xl text-foreground leading-tight tracking-tight sm:text-5xl md:text-6xl">
						AI-powered
						<br />
						organization for your
						<br />
						Spotify music library.
					</h1>
				</div>

				<div className="flex-1" />
			</div>

			<div className="border-border border-t bg-card px-8 py-10 sm:px-12 sm:py-12 lg:px-16">
				<div className="mx-auto max-w-2xl lg:mx-0">
					<div className="flex flex-col gap-8">
						<div className="flex flex-col gap-3">
							<h2 className="font-semibold text-foreground text-lg">
								Connect your Spotify account
							</h2>
							<p className="max-w-md text-muted-foreground text-sm leading-relaxed">
								Sonaraem analyzes your music library and automatically creates
								intelligent playlists based on your music taste.
							</p>
						</div>

						<AuthSpotifySignInButton />

						<p className="text-muted-foreground text-xs">
							Sonaraem only reads your playlists and liked songs.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
