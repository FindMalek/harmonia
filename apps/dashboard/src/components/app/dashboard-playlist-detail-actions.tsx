import { Badge, Button, Icons } from "@harmonia/ui";
import { formatDistanceToNow } from "date-fns";

export function DashboardPlaylistDetailActions({
	spotifyPlaylistId,
	exportedAt,
	exportPending,
	onExport,
}: {
	spotifyPlaylistId: string | null;
	exportedAt: Date | null;
	exportPending: boolean;
	onExport: () => void;
}) {
	const isExported = spotifyPlaylistId !== null;

	return (
		<div className="flex flex-col gap-2">
			{isExported ? (
				<div className="flex items-center justify-between gap-2">
					<Badge
						variant="outline"
						className="border-[#1DB954]/40 text-[#1DB954]"
					>
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
						{isExported ? "Updating..." : "Exporting..."}
					</>
				) : isExported ? (
					"Update in Spotify"
				) : (
					"Export to Spotify"
				)}
			</Button>
		</div>
	);
}
