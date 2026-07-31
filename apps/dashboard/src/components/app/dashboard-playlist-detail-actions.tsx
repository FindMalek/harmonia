import { Button, Icons, Switch } from "@harmonia/ui";

export function DashboardPlaylistDetailActions({
	spotifyPlaylistId,
	autoSyncEnabled,
	autoSyncPending,
	onToggleAutoSync,
	exportPending,
	onExport,
}: {
	spotifyPlaylistId: string | null;
	autoSyncEnabled: boolean;
	autoSyncPending: boolean;
	onToggleAutoSync: (checked: boolean) => void;
	exportPending: boolean;
	onExport: () => void;
}) {
	return (
		<div className="flex flex-col gap-2">
			{spotifyPlaylistId ? (
				<a
					href={`https://open.spotify.com/playlist/${spotifyPlaylistId}`}
					target="_blank"
					rel="noreferrer"
				>
					<Button className="w-full bg-[#1DB954] font-bold text-black uppercase tracking-widest hover:bg-[#1ed760]">
						Open in Spotify
						<Icons.externalLink className="ml-2 size-4" />
					</Button>
				</a>
			) : null}
			<Button
				variant="outline"
				className="w-full font-bold uppercase tracking-widest"
				onClick={onExport}
				disabled={exportPending}
			>
				{exportPending ? (
					<>
						<Icons.spinner className="mr-2 size-4 animate-spin" />
						Creating...
					</>
				) : (
					"Create Spotify Playlist"
				)}
			</Button>
			{spotifyPlaylistId ? (
				<div className="flex items-center justify-between gap-3 border-t py-3">
					<div className="flex flex-col gap-0.5">
						<span className="font-medium text-sm">Auto-update in Spotify</span>
						<span className="text-muted-foreground text-xs">
							{autoSyncEnabled
								? "Harmonia pushes changes here automatically after each run."
								: "Off — Harmonia keeps this playlist current, but you push updates yourself."}
						</span>
					</div>
					<Switch
						checked={autoSyncEnabled}
						disabled={autoSyncPending}
						onCheckedChange={onToggleAutoSync}
					/>
				</div>
			) : null}
		</div>
	);
}
