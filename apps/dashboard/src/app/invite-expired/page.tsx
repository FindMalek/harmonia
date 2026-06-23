import { HarmoniaBrandHeader } from "@harmonia/ui";

export default function InviteExpiredPage() {
	return (
		<div className="flex h-full min-h-svh flex-col bg-background font-sans">
			<div className="flex flex-1 flex-col justify-between p-8 sm:p-12 lg:p-16">
				<HarmoniaBrandHeader />

				<div className="mt-42 mb-16 max-w-2xl border-foreground border-l-4 pl-6 sm:pl-8">
					<h1 className="font-semibold text-3xl text-foreground leading-tight tracking-tight sm:text-5xl md:text-6xl">
						Invite link
						<br />
						has expired.
					</h1>
					<p className="mt-6 text-base text-muted-foreground leading-relaxed">
						This invite link is no longer valid. Please contact us if you think
						this is a mistake.
					</p>
				</div>

				<div className="flex-1" />
			</div>
		</div>
	);
}
