"use client";

import { useExportPlaylist } from "@/hooks/mutations/use-export-playlist";
import { usePlaylistDetail } from "@/hooks/queries/use-playlists";
import { Button, Icons, Separator, Skeleton } from "@harmonia/ui";
import Link from "next/link";
import { use } from "react";

export default function PlaylistDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const playlistId = Number(id);

	const { data: playlist, isLoading, isError } = usePlaylistDetail(playlistId);
	const exportMutation = useExportPlaylist();

	if (isLoading) {
		return <PlaylistDetailSkeleton />;
	}

	if (isError || !playlist) {
		return (
			<div className="flex flex-col gap-6">
				<BackLink />
				<p className="text-muted-foreground text-sm">Playlist not found.</p>
			</div>
		);
	}

	const themes = playlist.themes?.join(", ") ?? null;

	return (
		<div className="flex flex-col gap-6">
			<BackLink />

			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight">{playlist.name}</h1>
				{playlist.description && (
					<p className="text-muted-foreground text-sm">{playlist.description}</p>
				)}
			</div>

			<section className="flex flex-col">
				<SectionLabel label="METADATA" />
				<MetadataRow label="Tracks" value={String(playlist.trackCount)} />
				{playlist.mood && (
					<MetadataRow label="Mood" value={playlist.mood} />
				)}
				{playlist.energy && (
					<MetadataRow label="Energy" value={playlist.energy} />
				)}
				{themes && (
					<MetadataRow label="Themes" value={themes} />
				)}
			</section>

			<div className="flex flex-col gap-2">
				{playlist.spotifyPlaylistId && (
					<a
						href={`https://open.spotify.com/playlist/${playlist.spotifyPlaylistId}`}
						target="_blank"
						rel="noreferrer"
					>
						<Button className="w-full bg-[#1DB954] hover:bg-[#1ed760] font-bold uppercase tracking-widest text-black">
							Open in Spotify
							<Icons.externalLink className="ml-2 size-4" />
						</Button>
					</a>
				)}
				<Button
					variant="outline"
					className="w-full font-bold uppercase tracking-widest"
					onClick={() => exportMutation.mutate({ id: playlist.id })}
					disabled={exportMutation.isPending}
				>
					{exportMutation.isPending ? (
						<>
							<Icons.spinner className="mr-2 size-4 animate-spin" />
							Creating...
						</>
					) : (
						"Create Spotify Playlist"
					)}
				</Button>
			</div>

			<section className="flex flex-col">
				<SectionLabel label="TRACKLIST" />
				{playlist.tracks.map((track, index) => (
					<TrackRow key={track.id} track={track} index={index} />
				))}
				{playlist.tracks.length === 0 && (
					<p className="py-4 text-muted-foreground text-sm">No tracks yet.</p>
				)}
			</section>
		</div>
	);
}

function BackLink() {
	return (
		<div className="flex flex-col gap-2">
			<Link
				href="/playlists"
				className="flex items-center gap-1 text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground"
			>
				<Icons.arrowLeft className="size-3" />
				Playlists
			</Link>
			<Separator />
		</div>
	);
}

function SectionLabel({ label }: { label: string }) {
	return (
		<div className="flex flex-col gap-2 pb-2">
			<span className="text-muted-foreground text-xs uppercase tracking-widest">
				{label}
			</span>
			<Separator />
		</div>
	);
}

function MetadataRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between border-b py-4 last:border-b-0">
			<span className="text-muted-foreground text-sm">{label}</span>
			<span className="font-medium text-sm">{value}</span>
		</div>
	);
}

function TrackRow({
	track,
	index,
}: {
	track: {
		id: string;
		name: string;
		artistNames: string;
		albumName: string | null;
		albumImageUrl: string | null;
		durationMs: number | null;
	};
	index: number;
}) {
	const artists = safeParseArray(track.artistNames);

	return (
		<div className="flex items-center gap-4 border-b py-4 last:border-b-0">
			<span className="w-6 shrink-0 text-right text-muted-foreground text-sm">
				{String(index + 1).padStart(2, "0")}
			</span>
			{track.albumImageUrl ? (
				<img
					src={track.albumImageUrl}
					alt=""
					className="size-12 shrink-0 rounded object-cover"
				/>
			) : (
				<div className="size-12 shrink-0 rounded bg-muted" />
			)}
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{track.name}</p>
				<p className="truncate text-muted-foreground text-xs">
					{artists.join(", ")}
					{track.albumName ? ` • ${track.albumName}` : ""}
				</p>
			</div>
		</div>
	);
}

function safeParseArray(json: string): string[] {
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function PlaylistDetailSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<Skeleton className="h-3 w-20" />
				<Skeleton className="h-px w-full" />
			</div>
			<div className="flex flex-col gap-2">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-96" />
			</div>
			<div className="flex flex-col gap-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-12 w-full" />
				))}
			</div>
			<div className="flex flex-col gap-2">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
			<div className="flex flex-col gap-2">
				{Array.from({ length: 8 }).map((_, i) => (
					<Skeleton key={i} className="h-16 w-full" />
				))}
			</div>
		</div>
	);
}
