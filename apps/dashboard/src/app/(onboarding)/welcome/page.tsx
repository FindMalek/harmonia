export default function WelcomePage() {
	return (
		<div className="flex flex-col items-start gap-8">
			<div className="space-y-4">
				<h1 className="font-semibold text-3xl text-foreground leading-tight tracking-tight sm:text-4xl">
					Welcome to Sonaraem
				</h1>
				<p className="max-w-md text-sm">
					Sonaraem organizes your Spotify library automatically using AI.
				</p>

				<p className="max-w-md text-muted-foreground text-sm">
					It analyzes your songs and builds intelligent playlists based on your
					music taste.
				</p>
			</div>
		</div>
	);
}
