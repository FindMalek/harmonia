"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { usePlaylists } from "@/hooks/queries/use-playlists";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { Button, Icons, Skeleton } from "@harmonia/ui";
import Link from "next/link";

export default function PlaylistsPage() {
	const { data: playlists, isLoading, isError, error, refetch } = usePlaylists();

	if (isError) {
		return (
			<div className="space-y-4">
				<PageHeader />
				<ErrorState
					message={error instanceof Error ? error.message : "Failed to load playlists"}
					onRetry={() => refetch()}
				/>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="space-y-4">
				<PageHeader />
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<PlaylistCardSkeleton key={i} />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader />

			{!playlists?.length ? (
				<EmptyState
					icon={Icons.disc}
					title="No playlists yet"
					description="Run the pipeline to generate playlists from your library."
					action={{
						label: "Run Pipeline",
						onClick: () => (window.location.href = DASHBOARD_ROUTES.overview.path),
					}}
					variant="card"
				/>
			) : (
				<div className="space-y-3">
					{playlists.map((pl) => (
						<PlaylistCard key={pl.id} playlist={pl} />
					))}
				</div>
			)}
		</div>
	);
}

function PageHeader() {
	return (
		<div>
			<h1 className="font-bold text-2xl">Your AI Playlists</h1>
			<p className="text-muted-foreground text-sm">
				Playlists generated from your music taste.
			</p>
		</div>
	);
}

function PlaylistCardSkeleton() {
	return (
		<div className="rounded-lg border p-5 space-y-4">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-2 flex-1">
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
				</div>
				<Skeleton className="h-4 w-16 shrink-0" />
			</div>
			<div className="flex gap-2">
				<Skeleton className="h-7 w-20 rounded-md" />
				<Skeleton className="h-7 w-24 rounded-md" />
				<Skeleton className="h-7 w-20 rounded-md" />
			</div>
			<Skeleton className="h-10 w-full rounded-md" />
		</div>
	);
}

function PlaylistCard({
	playlist,
}: {
	playlist: {
		id: number;
		name: string;
		description: string | null;
		trackCount: number;
		tags: string[] | null;
		spotifyPlaylistId: string | null;
	};
}) {
	return (
		<div className="rounded-lg border p-5 space-y-4">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1 flex-1">
					<h2 className="font-bold text-lg leading-tight">{playlist.name}</h2>
					{playlist.description && (
						<p className="text-muted-foreground text-sm leading-snug">
							{playlist.description}
						</p>
					)}
				</div>
				<div className="flex items-center gap-1 text-muted-foreground text-xs shrink-0 pt-1">
					<Icons.disc className="size-3.5" />
					<span>{playlist.trackCount}</span>
				</div>
			</div>

			{playlist.tags && playlist.tags.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{playlist.tags.map((tag) => (
						<span
							key={tag}
							className="rounded-md border px-2.5 py-1 text-xs font-medium lowercase"
						>
							{tag}
						</span>
					))}
				</div>
			)}

			<Link href={`/playlists/${playlist.id}`} className="block">
				<Button variant="secondary" className="w-full text-xs font-medium">
					Open playlist
				</Button>
			</Link>
		</div>
	);
}
