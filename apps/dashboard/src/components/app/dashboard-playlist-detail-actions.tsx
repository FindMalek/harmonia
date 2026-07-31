import { Badge, Button, Icons, Switch } from "@harmonia/ui";
import { formatDistanceToNow } from "date-fns";

export function DashboardPlaylistDetailActions({
	spotifyPlaylistId,
	exportedAt,
	autoSyncEnabled,
	autoSyncPending,
	onToggleAutoSync,
	exportPending,
	onExport,
}: {
	spotifyPlaylistId: string | null;
	exportedAt: Date | null;
	autoSyncEnabled: boolean;
	autoSyncPending: boolean;
	onToggleAutoSync: (checked: boolean) => void;
	exportPending: boolean;
	onExport: () => void;
}) {
	const isExported = Boolean(spotifyPlaylistId);

	return (
		<div className="flex flex-col gap-2">
			{isExported ? (
				<div className="flex items-center justify-between gap-2">
					<Badge variant="outline" className="border-primary/40 text-primary">
						<Icons.circleCheck className="size-3" />
						Exported
					</Badge>
					{exportedAt ? (
						<span className="text-muted-foreground text-xs">
							Synced {formatDistanceToNow(exportedAt, { addSuffix: true })}
						</span>
					) : null}
				</div>
			) : null}
			{spotifyPlaylistId ? (
				<a
					href={`https://open.spotify.com/playlist/${spotifyPlaylistId}`}
					target="_blank"
					rel="noreferrer"
				>
					<Button className="w-full bg-primary font-bold text-primary-foreground uppercase tracking-widest hover:bg-primary/90">
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
						{isExported ? "Updating..." : "Exporting..."}
					</>
				) : isExported ? (
					"Update in Spotify"
				) : (
					"Export to Spotify"
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
