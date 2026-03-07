"use client";

import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Input,
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@harmonia/ui";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { orpc, queryClient } from "@/lib/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Icons } from "@harmonia/ui";
import { useState } from "react";
import { toast } from "sonner";

export default function PlaylistsPage() {
	const {
		data: playlists,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery(orpc.playlists.list.queryOptions());
	const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(
		null,
	);

	const { data: playlistDetail } = useQuery({
		...orpc.playlists.getById.queryOptions({
			input: { id: selectedPlaylistId ?? 0 },
		}),
		enabled: selectedPlaylistId !== null,
	});

	const exportMutation = useMutation(
		orpc.playlists.export.mutationOptions({
			onSuccess: (data) => {
				if (data) {
					toast.success("Playlist exported to Spotify!");
					queryClient.invalidateQueries();
				} else {
					toast.error("Failed to export playlist");
				}
			},
			onError: (error) => {
				const msg = error.message ?? "Export failed";
				toast.error(msg, {
					action: {
						label: "Copy",
						onClick: async () => {
							try {
								await navigator.clipboard.writeText(msg);
								toast.success("Copied");
							} catch {
								toast.error("Failed to copy");
							}
						},
					},
				});
			},
		}),
	);

	const exportAllMutation = useMutation(
		orpc.playlists.exportAll.mutationOptions({
			onSuccess: (data) => {
				toast.success(
					`Exported ${data.exported} playlists${data.failed > 0 ? ` (${data.failed} failed)` : ""}`,
				);
				queryClient.invalidateQueries();
			},
			onError: (error) => {
				const msg = error.message ?? "Export failed";
				toast.error(msg, {
					action: {
						label: "Copy",
						onClick: async () => {
							try {
								await navigator.clipboard.writeText(msg);
								toast.success("Copied");
							} catch {
								toast.error("Failed to copy");
							}
						},
					},
				});
			},
		}),
	);

	if (isError) {
		return (
			<div className="space-y-4">
				<div>
					<h2 className="font-semibold text-base">Playlists</h2>
					<p className="text-muted-foreground text-xs">
						Generated playlists from your library
					</p>
				</div>
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
			<div className="space-y-4">
				<div>
					<h2 className="font-semibold text-base">Playlists</h2>
					<p className="text-muted-foreground text-xs">
						Generated playlists from your library
					</p>
				</div>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<PlaylistCardSkeleton key={i} />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-semibold text-base">Playlists</h2>
					<p className="text-muted-foreground text-xs">
						{playlists?.length ?? 0} generated playlists
					</p>
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={() => exportAllMutation.mutate({})}
					disabled={exportAllMutation.isPending || !playlists?.length}
				>
					{exportAllMutation.isPending ? (
						<>
							<Icons.spinner className="size-3.5 animate-spin" />
							Exporting...
						</>
					) : (
						"Export All to Spotify"
					)}
				</Button>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{playlists?.map((pl) => (
					<PlaylistCard
						key={pl.id}
						playlist={pl}
						isSelected={selectedPlaylistId === pl.id}
						onSelect={() => setSelectedPlaylistId(pl.id)}
						onExport={() => exportMutation.mutate({ id: pl.id })}
						isExporting={exportMutation.isPending}
					/>
				))}
			</div>

			{!playlists?.length && (
				<EmptyState
					icon={Icons.disc}
					title="No playlists yet"
					description="Run the pipeline to generate playlists from your library."
					action={{
						label: "Run Pipeline",
						onClick: () => (window.location.href = "/dashboard"),
					}}
					variant="card"
				/>
			)}

			<Sheet
				open={selectedPlaylistId !== null && !!playlistDetail}
				onOpenChange={(open) => !open && setSelectedPlaylistId(null)}
			>
				<SheetContent side="right" className="w-full max-w-md sm:max-w-lg">
					{playlistDetail && (
						<PlaylistDetail
							playlist={playlistDetail}
							onClose={() => setSelectedPlaylistId(null)}
						/>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}

function PlaylistCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-start gap-3">
					<Skeleton className="h-8 w-8 shrink-0" />
					<div className="min-w-0 flex-1 space-y-1">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-24" />
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex gap-1">
					<Skeleton className="h-5 w-16" />
					<Skeleton className="h-5 w-14" />
				</div>
			</CardContent>
			<CardFooter>
				<Skeleton className="h-6 w-24" />
			</CardFooter>
		</Card>
	);
}

function PlaylistCard({
	playlist,
	isSelected,
	onSelect,
	onExport,
	isExporting,
}: {
	playlist: {
		id: number;
		name: string;
		description: string | null;
		taxonomy: string | null;
		trackCount: number;
		coverColor: string | null;
		spotifyPlaylistId: string | null;
		exportedAt: Date | string | null;
	};
	isSelected: boolean;
	onSelect: () => void;
	onExport: () => void;
	isExporting: boolean;
}) {
	return (
		<Card
			className={`cursor-pointer transition-all duration-200 hover:bg-muted/50 hover:shadow-md ${
				isSelected ? "ring-2 ring-primary" : ""
			}`}
			onClick={onSelect}
		>
			<CardHeader>
				<div className="flex items-start gap-3">
					{playlist.coverColor && (
						<div
							className="mt-0.5 h-8 w-8 shrink-0 rounded-sm"
							style={{ backgroundColor: playlist.coverColor }}
						/>
					)}
					<div className="min-w-0 flex-1">
						<CardTitle className="text-sm">{playlist.name}</CardTitle>
						{playlist.description && (
							<CardDescription className="mt-1 line-clamp-2">
								{playlist.description}
							</CardDescription>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex flex-wrap gap-1">
					<Badge variant="secondary" className="text-[10px]">
						{playlist.trackCount} tracks
					</Badge>
					{playlist.taxonomy && (
						<Badge variant="outline" className="text-[10px]">
							{playlist.taxonomy}
						</Badge>
					)}
					{playlist.spotifyPlaylistId && (
						<Badge variant="default" className="text-[10px]">
							On Spotify
						</Badge>
					)}
				</div>
			</CardContent>
			<CardFooter>
				{!playlist.spotifyPlaylistId ? (
					<Button
						size="xs"
						variant="outline"
						onClick={(e) => {
							e.stopPropagation();
							onExport();
						}}
						disabled={isExporting}
					>
						{isExporting ? (
							<>
								<Icons.spinner className="size-3 animate-spin" />
								Exporting...
							</>
						) : (
							"Export to Spotify"
						)}
					</Button>
				) : (
					<a
						href={`https://open.spotify.com/playlist/${playlist.spotifyPlaylistId}`}
						target="_blank"
						rel="noreferrer"
						className="text-primary text-xs hover:underline"
						onClick={(e) => e.stopPropagation()}
					>
						Open in Spotify
					</a>
				)}
			</CardFooter>
		</Card>
	);
}

function PlaylistDetail({
	playlist,
	onClose,
}: {
	playlist: {
		id: number;
		name: string;
		description: string | null;
		tracks?: Array<{
			id: string;
			name: string;
			artistNames: string;
			albumName: string | null;
			durationMs: number | null;
			llmMood: string | null;
			position: number | null;
		}>;
	};
	onClose: () => void;
}) {
	const [editing, setEditing] = useState(false);
	const [editName, setEditName] = useState(playlist.name);
	const [editDesc, setEditDesc] = useState(playlist.description ?? "");

	const updateMutation = useMutation(
		orpc.playlists.update.mutationOptions({
			onSuccess: () => {
				toast.success("Playlist updated");
				setEditing(false);
				queryClient.invalidateQueries();
			},
			onError: (error) => {
				const msg = error.message ?? "Update failed";
				toast.error(msg, {
					action: {
						label: "Copy",
						onClick: async () => {
							try {
								await navigator.clipboard.writeText(msg);
								toast.success("Copied");
							} catch {
								toast.error("Failed to copy");
							}
						},
					},
				});
			},
		}),
	);

	return (
		<div className="flex flex-col gap-4">
			<SheetHeader>
				<div className="flex items-start justify-between">
					{editing ? (
						<div className="flex-1 space-y-2">
							<Input
								value={editName}
								onChange={(e) => setEditName(e.target.value)}
								className="font-semibold text-sm"
							/>
							<Input
								value={editDesc}
								onChange={(e) => setEditDesc(e.target.value)}
								placeholder="Description..."
								className="text-xs"
							/>
							<div className="flex gap-1">
								<Button
									size="xs"
									onClick={() =>
										updateMutation.mutate({
											id: playlist.id,
											name: editName,
											description: editDesc,
										})
									}
								>
									Save
								</Button>
								<Button
									size="xs"
									variant="ghost"
									onClick={() => setEditing(false)}
								>
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<>
							<div>
								<SheetTitle className="text-sm">{playlist.name}</SheetTitle>
								{playlist.description && (
									<p className="text-muted-foreground text-xs">
										{playlist.description}
									</p>
								)}
							</div>
							<div className="flex gap-1">
								<Button
									size="xs"
									variant="ghost"
									onClick={() => setEditing(true)}
								>
									Edit
								</Button>
								<Button size="xs" variant="ghost" onClick={onClose}>
									&times;
								</Button>
							</div>
						</>
					)}
				</div>
			</SheetHeader>
			<div>
				<div className="max-h-[400px] overflow-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="text-xs">#</TableHead>
								<TableHead className="text-xs">Track</TableHead>
								<TableHead className="text-xs">Artist</TableHead>
								<TableHead className="text-xs">Duration</TableHead>
								<TableHead className="text-xs">Mood</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{playlist.tracks?.map((t) => {
								const artists = safeParseArray(t.artistNames);
								const mins = t.durationMs
									? `${Math.floor(t.durationMs / 60000)}:${String(Math.floor((t.durationMs % 60000) / 1000)).padStart(2, "0")}`
									: "—";
								return (
									<TableRow key={t.id}>
										<TableCell className="text-muted-foreground text-xs">
											{(t.position ?? 0) + 1}
										</TableCell>
										<TableCell className="max-w-[200px] truncate font-medium text-xs">
											{t.name}
										</TableCell>
										<TableCell className="max-w-[150px] truncate text-muted-foreground text-xs">
											{artists.join(", ")}
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{mins}
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{t.llmMood ?? "—"}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
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
