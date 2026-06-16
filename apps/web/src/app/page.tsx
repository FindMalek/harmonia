import { HarmoniaBrandHeader } from "@harmonia/ui";

import { WaitlistForm } from "@/components/waitlist-form";

export default function WaitlistPage() {
	return (
		<div className="flex h-full min-h-svh flex-col bg-background font-sans">
			<div className="flex flex-1 flex-col justify-between p-6 sm:p-12 lg:p-16">
				<HarmoniaBrandHeader />

				{/* Hero */}
				<div className="mt-8 mb-6 max-w-2xl border-foreground border-l-4 pl-5 sm:mt-16 sm:mb-16 sm:pl-8">
					<h1 className="font-semibold text-3xl text-foreground leading-tight tracking-tight sm:text-5xl md:text-6xl">
						Your Spotify library,
						<br />
						intelligently organized.
					</h1>
					<p className="mt-4 max-w-md text-muted-foreground text-sm leading-snug sm:mt-6 sm:text-base sm:leading-relaxed">
						Harmonia uses AI to analyze your library and build meaningful
						playlists—no manual sorting through thousands of tracks.
					</p>
				</div>

				<div className="hidden flex-1 sm:block" />
			</div>

			<div className="border-border border-t bg-card px-6 py-6 sm:px-12 sm:py-12 lg:px-16">
				<div className="mx-auto max-w-2xl lg:mx-0">
					<div className="flex flex-col gap-5 sm:gap-8">
						<div className="flex flex-col gap-2 sm:gap-3">
							<h2 className="font-semibold text-foreground text-lg">
								Join the waitlist
							</h2>
							<p className="max-w-md text-muted-foreground text-sm leading-snug sm:leading-relaxed">
								We're in early testing and inviting a small group of users to
								try Harmonia first.
							</p>
						</div>

						<div className="border border-foreground p-3 sm:p-4">
							<p className="font-semibold text-foreground text-sm">
								First 3 months free
							</p>
							<p className="mt-1 text-muted-foreground text-sm leading-snug">
								Approved waitlist members get full access at no cost for 3
								months.
							</p>
						</div>

						<WaitlistForm />

						<p className="text-muted-foreground text-xs leading-snug">
							Early access is limited to 25 users—we'll invite gradually as
							spots open.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
