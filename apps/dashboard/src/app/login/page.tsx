import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { getServerSession } from "@/lib/get-server-session";
import { SpotifySignInButton } from "@/components/app/spotify-sign-in-button";
import { Icons } from "@harmonia/ui";

export default async function LoginPage() {
	const session = await getServerSession();

	if (session?.user) {
		redirect(DASHBOARD_ROUTES.overview.path);
	}

	return (
		<div className="flex h-full min-h-svh flex-col bg-background font-sans">
			<div className="flex flex-1 flex-col justify-between p-8 sm:p-12 lg:p-16">
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

						<SpotifySignInButton />

						<p className="text-xs text-muted-foreground">
							Harmonia only reads your playlists and liked songs.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
