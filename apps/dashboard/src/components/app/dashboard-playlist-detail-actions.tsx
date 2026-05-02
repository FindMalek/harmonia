import { Button, Icons } from "@harmonia/ui";

export function DashboardPlaylistDetailActions({
	spotifyPlaylistId,
	exportPending,
	onExport,
}: {
	spotifyPlaylistId: string | null;
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
		</div>
	);
}
