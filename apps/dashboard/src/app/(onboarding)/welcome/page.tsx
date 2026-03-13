export default function WelcomePage() {
	return (
		<div className="flex flex-col items-start gap-8">
			<div className="space-y-4">
				<h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
					Welcome to Harmonia
				</h1>
				<p className="max-w-md text-sm">
					Harmonia organizes your Spotify library automatically using AI.
				</p>

				<p className="max-w-md text-sm text-muted-foreground">
					It analyzes your songs and builds intelligent playlists based on your
					music taste.
				</p>
			</div>
		</div>
	);
}
