import { HarmoniaBrandHeader } from "@harmonia/ui";

import { WaitlistForm } from "@/components/waitlist-form";

export default function WaitlistPage() {
	return (
		<div className="flex h-full min-h-svh flex-col bg-background font-sans">
			<div className="flex flex-1 flex-col justify-between p-8 sm:p-12 lg:p-16">
				<HarmoniaBrandHeader />

				{/* Hero */}
				<div className="mt-16 mb-16 max-w-2xl border-foreground border-l-4 pl-6 sm:pl-8">
					<h1 className="font-semibold text-3xl text-foreground leading-tight tracking-tight sm:text-5xl md:text-6xl">
						Your Spotify library,
						<br />
						intelligently organized.
					</h1>
					<p className="mt-6 max-w-md text-muted-foreground text-sm leading-relaxed sm:text-base">
						Harmonia analyzes your music library and automatically creates
						meaningful playlists from your songs.
					</p>
					<p className="mt-4 max-w-md text-muted-foreground text-sm leading-relaxed">
						Instead of manually organizing thousands of tracks, Harmonia uses AI
						to understand your music and structure your library for you.
					</p>
				</div>

				<div className="flex-1" />
			</div>

			<div className="border-border border-t bg-card px-8 py-10 sm:px-12 sm:py-12 lg:px-16">
				<div className="mx-auto max-w-2xl lg:mx-0">
					<div className="flex flex-col gap-8">
						<div className="flex flex-col gap-3">
							<h2 className="font-semibold text-foreground text-lg">
								Join the waitlist
							</h2>
							<p className="max-w-md text-muted-foreground text-sm leading-relaxed">
								Harmonia is currently in early testing. We are inviting a small
								number of users to try the product first while we improve the
								system.
							</p>
						</div>

						<div className="border border-foreground p-4">
							<p className="font-semibold text-foreground text-sm">
								First 3 months free
							</p>
							<p className="mt-1 text-muted-foreground text-sm">
								Everyone approved from the waitlist gets full access to Harmonia
								at no cost for their first 3 months.
							</p>
						</div>

						<WaitlistForm />

						<p className="text-muted-foreground text-xs">
							Early access is currently limited.
						</p>
					</div>
				</div>
			</div>

			<div className="border-border border-t px-8 py-6 sm:px-12 lg:px-16">
				<p className="text-muted-foreground text-xs">
					We will invite users gradually as new spots open.
				</p>
			</div>
		</div>
	);
}
