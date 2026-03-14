export default function IntroductionPage() {
	return (
		<div className="flex flex-col items-start gap-8 w-full">
			<div className="space-y-2">
				<h1 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
					HOW HARMONIA WORKS
				</h1>
			</div>

			<div className="flex flex-col w-full">
				<div className="flex gap-6 py-8 border-t border-border/50">
					<span className="text-xl font-light text-muted-foreground">01</span>
					<div className="space-y-3 pt-1">
						<h3 className="text-base font-medium text-foreground">
							AI analyzes your music
						</h3>
						<p className="text-sm text-muted-foreground leading-relaxed">
							Harmonia examines your songs to understand their mood, themes, and
							musical patterns.
						</p>
					</div>
				</div>

				<div className="flex gap-6 py-8 border-t border-border/50">
					<span className="text-xl font-light text-muted-foreground">02</span>
					<div className="space-y-3 pt-1">
						<h3 className="text-base font-medium text-foreground">
							Playlists are generated automatically
						</h3>
						<p className="text-sm text-muted-foreground leading-relaxed">
							Your music library is transformed into intelligent playlists based
							on how songs relate to each other.
						</p>
					</div>
				</div>

				<div className="flex gap-6 py-8 border-t border-b border-border/50">
					<span className="text-xl font-light text-muted-foreground">03</span>
					<div className="space-y-3 pt-1">
						<h3 className="text-base font-medium text-foreground">
							Your library becomes organized
						</h3>
						<p className="text-sm text-muted-foreground leading-relaxed">
							Every track finds its place so your music becomes easier to
							explore and enjoy.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
