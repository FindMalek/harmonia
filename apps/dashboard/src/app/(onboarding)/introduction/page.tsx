import Link from "next/link";
import { Button } from "@harmonia/ui";

export default function IntroductionPage() {
	return (
		<div className="flex flex-col items-start gap-8">
			<div className="space-y-2">
				<h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
					How Harmonia Works
				</h1>
			</div>

			<div className="flex flex-col gap-6">
				<div className="flex gap-4">
					<span className="text-xl font-bold text-muted-foreground/50">01</span>
					<div className="space-y-1">
						<h3 className="font-medium text-foreground">
							AI analyzes your music
						</h3>
						<p className="text-sm text-muted-foreground">
							Harmonia examines your songs to understand their mood, themes, and
							musical patterns.
						</p>
					</div>
				</div>

				<div className="flex gap-4">
					<span className="text-xl font-bold text-muted-foreground/50">02</span>
					<div className="space-y-1">
						<h3 className="font-medium text-foreground">
							Playlists are generated automatically
						</h3>
						<p className="text-sm text-muted-foreground">
							Your music library is transformed into intelligent playlists based
							on how songs relate to each other.
						</p>
					</div>
				</div>

				<div className="flex gap-4">
					<span className="text-xl font-bold text-muted-foreground/50">03</span>
					<div className="space-y-1">
						<h3 className="font-medium text-foreground">
							Your library becomes organized
						</h3>
						<p className="text-sm text-muted-foreground">
							Every track finds its place so your music becomes easier to
							explore and enjoy.
						</p>
					</div>
				</div>
			</div>

			<Button asChild size="lg" className="w-full sm:w-auto mt-4">
				<Link href="/onboarding/sync">Next</Link>
			</Button>
		</div>
	);
}
