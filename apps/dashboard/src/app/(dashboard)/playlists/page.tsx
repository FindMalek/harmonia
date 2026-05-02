"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useExportAllPlaylists } from "@/hooks/mutations/use-export-all-playlists";
import { usePlaylists } from "@/hooks/queries/use-playlists";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { Button, Icons, Separator, Skeleton } from "@harmonia/ui";
import Link from "next/link";

export default function PlaylistsPage() {
	const { data: playlists, isLoading, isError, error, refetch } = usePlaylists();
	const exportAllMutation = useExportAllPlaylists();

	if (isError) {
		return (
			<div className="flex flex-col gap-4">
				<PageHeader count={0} onExportAll={undefined} isExporting={false} />
				<ErrorState
					message={
						error instanceof Error ? error.message : "Failed to load playlists"
					}
					onRetry={() => refetch()}
				/>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex flex-col gap-4">
				<PageHeader count={0} onExportAll={undefined} isExporting={false} />
				<div className="flex flex-col gap-2">
					{Array.from({ length: 6 }).map((_, i) => (
						<PlaylistRowSkeleton key={i} />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				count={playlists?.length ?? 0}
				onExportAll={() => exportAllMutation.mutate({})}
				isExporting={exportAllMutation.isPending}
			/>

			{playlists?.length ? (
				<div className="flex flex-col">
					{playlists.map((pl, i) => (
						<PlaylistRow
							key={pl.id}
							playlist={pl}
							isLast={i === (playlists?.length ?? 0) - 1}
						/>
					))}
				</div>
			) : (
				<EmptyState
					icon={Icons.disc}
					title="No playlists yet"
					description="Run the pipeline to generate playlists from your library."
					action={{
						label: "Run Pipeline",
						onClick: () =>
							(window.location.href = DASHBOARD_ROUTES.overview.path),
					}}
					variant="card"
				/>
			)}
		</div>
	);
}

function PageHeader({
	count,
	onExportAll,
	isExporting,
}: {
	count: number;
	onExportAll: (() => void) | undefined;
	isExporting: boolean;
}) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-semibold text-base">Your AI Playlists</h2>
					<p className="text-muted-foreground text-xs">{count} generated playlists</p>
				</div>
				{onExportAll && (
					<Button
						size="sm"
						variant="outline"
						onClick={onExportAll}
						disabled={isExporting || !count}
					>
						{isExporting ? (
							<>
								<Icons.spinner className="size-3.5 animate-spin" />
								Exporting...
							</>
						) : (
							"Export All to Spotify"
						)}
					</Button>
				)}
			</div>
			<Separator />
		</div>
	);
}

function PlaylistRow({
	playlist,
	isLast,
}: {
	playlist: {
		id: number;
		name: string;
		description: string | null;
		taxonomy: string | null;
		trackCount: number;
		coverColor: string | null;
		spotifyPlaylistId: string | null;
	};
	isLast: boolean;
}) {
	return (
		<div className={`flex items-center justify-between py-4 ${!isLast ? "border-b" : ""}`}>
			<div className="flex min-w-0 flex-1 items-center gap-3">
				{playlist.coverColor ? (
					<div
						className="size-10 shrink-0 rounded"
						style={{ backgroundColor: playlist.coverColor }}
					/>
				) : (
					<div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
						<Icons.music className="size-4 text-muted-foreground" />
					</div>
				)}
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-sm">{playlist.name}</p>
					{playlist.description && (
						<p className="truncate text-muted-foreground text-xs">
							{playlist.description}
						</p>
					)}
					<div className="mt-1 flex items-center gap-2">
						<span className="text-muted-foreground text-xs">
							{playlist.trackCount} tracks
						</span>
						{playlist.taxonomy && (
							<span className="rounded-full border px-2 py-0.5 text-xs">
								{playlist.taxonomy}
							</span>
						)}
						{playlist.spotifyPlaylistId && (
							<span className="rounded-full bg-[#1DB954]/10 px-2 py-0.5 text-xs text-[#1DB954]">
								On Spotify
							</span>
						)}
					</div>
				</div>
			</div>
			<Link href={`/playlists/${playlist.id}`}>
				<Button variant="ghost" size="sm" className="shrink-0 text-xs">
					Open playlist
					<Icons.chevronRight className="ml-1 size-3" />
				</Button>
			</Link>
		</div>
	);
}

function PlaylistRowSkeleton() {
	return (
		<div className="flex items-center justify-between border-b py-4">
			<div className="flex flex-1 items-center gap-3">
				<Skeleton className="size-10 shrink-0 rounded" />
				<div className="flex-1 space-y-1.5">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-3 w-64" />
					<Skeleton className="h-3 w-20" />
				</div>
			</div>
			<Skeleton className="h-8 w-28" />
		</div>
	);
}
