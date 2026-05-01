export default function IntroductionPage() {
	return (
		<div className="flex w-full flex-col items-start gap-8">
			<div className="space-y-2">
				<h1 className="font-semibold text-muted-foreground text-sm uppercase tracking-widest">
					HOW HARMONIA WORKS
				</h1>
			</div>

			<div className="flex w-full flex-col">
				<div className="flex gap-6 border-border/50 border-t py-8">
					<span className="font-light text-muted-foreground text-xl">01</span>
					<div className="space-y-3 pt-1">
						<h3 className="font-medium text-base text-foreground">
							AI analyzes your music
						</h3>
						<p className="text-muted-foreground text-sm leading-relaxed">
							Harmonia examines your songs to understand their mood, themes, and
							musical patterns.
						</p>
					</div>
				</div>

				<div className="flex gap-6 border-border/50 border-t py-8">
					<span className="font-light text-muted-foreground text-xl">02</span>
					<div className="space-y-3 pt-1">
						<h3 className="font-medium text-base text-foreground">
							Playlists are generated automatically
						</h3>
						<p className="text-muted-foreground text-sm leading-relaxed">
							Your music library is transformed into intelligent playlists based
							on how songs relate to each other.
						</p>
					</div>
				</div>

				<div className="flex gap-6 border-border/50 border-t border-b py-8">
					<span className="font-light text-muted-foreground text-xl">03</span>
					<div className="space-y-3 pt-1">
						<h3 className="font-medium text-base text-foreground">
							Your library becomes organized
						</h3>
						<p className="text-muted-foreground text-sm leading-relaxed">
							Every track finds its place so your music becomes easier to
							explore and enjoy.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
