"use client";

import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	EmptyState,
	ErrorState,
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
import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";
import { Music2 } from "lucide-react";
import { useState } from "react";

export default function TracksPage() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

	const { data, isLoading, isError, error, refetch } = useQuery(
		orpc.tracks.list.queryOptions({
			input: { page, pageSize: 30, search: search || undefined },
		}),
	);

	const { data: selectedTrack } = useQuery({
		...orpc.tracks.getById.queryOptions({
			input: { id: selectedTrackId ?? "" },
		}),
		enabled: !!selectedTrackId,
	});

	const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-semibold text-base">Tracks</h2>
					<p className="text-muted-foreground text-xs">
						{data?.total.toLocaleString() ?? "..."} tracks in your library
					</p>
				</div>
				<Input
					placeholder="Search tracks..."
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
						setPage(1);
					}}
					className="w-64"
				/>
			</div>

			{isError && (
				<ErrorState
					message={
						error instanceof Error ? error.message : "Failed to load tracks"
					}
					onRetry={() => refetch()}
				/>
			)}

			<div className="flex gap-4">
				<div className={selectedTrackId ? "flex-1" : "w-full"}>
					<div className="overflow-auto border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="text-xs">Track</TableHead>
									<TableHead className="text-xs">Artist</TableHead>
									<TableHead className="text-xs">Status</TableHead>
									<TableHead className="text-xs">Mood</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading
									? Array.from({ length: 6 }).map((_, i) => (
											<TableRow key={i}>
												<TableCell>
													<Skeleton className="h-4 w-[180px]" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-[120px]" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-[80px]" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-[60px]" />
												</TableCell>
											</TableRow>
										))
									: (data?.tracks.map((t) => {
											const artists = safeParseArray(t.artistNames);
											return (
												<TableRow
													key={t.id}
													className="cursor-pointer"
													onClick={() => setSelectedTrackId(t.id)}
													data-state={
														selectedTrackId === t.id ? "selected" : undefined
													}
												>
													<TableCell className="max-w-[200px] truncate font-medium text-xs">
														{t.name}
													</TableCell>
													<TableCell className="max-w-[150px] truncate text-muted-foreground text-xs">
														{artists.join(", ")}
													</TableCell>
													<TableCell>
														<div className="flex gap-1">
															<StatusBadge
																status={t.lyricsStatus ?? "pending"}
																type="lyrics"
															/>
															{t.llmClassifiedAt && (
																<Badge
																	variant="outline"
																	className="text-[10px]"
																>
																	AI
																</Badge>
															)}
															{t.embeddingGeneratedAt && (
																<Badge
																	variant="outline"
																	className="text-[10px]"
																>
																	EMB
																</Badge>
															)}
														</div>
													</TableCell>
													<TableCell className="text-muted-foreground text-xs">
														{t.llmMood ?? "—"}
													</TableCell>
												</TableRow>
											);
										}) ?? null)}
							</TableBody>
						</Table>
					</div>

					{!isLoading && data && data.tracks.length === 0 && (
						<EmptyState
							icon={Music2}
							title="No tracks found"
							description={
								search
									? "Try a different search term."
									: "Sync your Spotify library to get started."
							}
						/>
					)}

					{totalPages > 1 && (
						<div className="mt-3 flex items-center justify-between">
							<span className="text-muted-foreground text-xs">
								Page {page} of {totalPages}
							</span>
							<div className="flex gap-1">
								<Button
									variant="outline"
									size="xs"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page <= 1}
								>
									Prev
								</Button>
								<Button
									variant="outline"
									size="xs"
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page >= totalPages}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</div>

				<Sheet
					open={!!selectedTrackId && !!selectedTrack}
					onOpenChange={(open) => !open && setSelectedTrackId(null)}
				>
					<SheetContent side="right" className="w-full max-w-md sm:max-w-lg">
						{selectedTrack && <TrackDetail track={selectedTrack} />}
					</SheetContent>
				</Sheet>
			</div>
		</div>
	);
}

function TrackDetail({
	track,
}: {
	track: {
		id: string;
		name: string;
		artistNames: string;
		albumName: string | null;
		durationMs: number | null;
		lyricsStatus: string | null;
		lyrics: string | null;
		llmMood: string | null;
		llmTags: unknown;
		llmClassifiedAt: Date | string | null;
		embeddingGeneratedAt: Date | string | null;
		clusterId: number | null;
	};
}) {
	const artists = safeParseArray(track.artistNames);
	const tags = (track.llmTags as Record<string, unknown>) ?? {};
	const [showLyrics, setShowLyrics] = useState(false);

	return (
		<div className="flex flex-col gap-4">
			<SheetHeader>
				<SheetTitle>{track.name}</SheetTitle>
				<p className="text-muted-foreground text-xs">{artists.join(", ")}</p>
				{track.albumName && (
					<p className="text-muted-foreground text-xs">{track.albumName}</p>
				)}
			</SheetHeader>
			<div className="space-y-3 text-xs">
				<Section title="Status">
					<div className="flex flex-wrap gap-1">
						<StatusBadge
							status={track.lyricsStatus ?? "pending"}
							type="lyrics"
						/>
						{track.llmClassifiedAt && (
							<Badge variant="outline">Classified</Badge>
						)}
						{track.embeddingGeneratedAt && (
							<Badge variant="outline">Embedded</Badge>
						)}
						{track.clusterId && (
							<Badge variant="secondary">Cluster #{track.clusterId}</Badge>
						)}
					</div>
				</Section>

				{track.llmMood && (
					<Section title="AI Analysis">
						<p>
							<strong>Mood:</strong> {track.llmMood}
						</p>
						{tags.energyLevel != null && (
							<p>
								<strong>Energy:</strong> {String(tags.energyLevel)}
							</p>
						)}
						{Array.isArray(tags.themes) &&
							(tags.themes as string[]).length > 0 && (
								<p>
									<strong>Themes:</strong>{" "}
									{(tags.themes as string[]).join(", ")}
								</p>
							)}
						{Array.isArray(tags.vibe) && (tags.vibe as string[]).length > 0 && (
							<p>
								<strong>Vibe:</strong> {(tags.vibe as string[]).join(", ")}
							</p>
						)}
						{Array.isArray(tags.topics) &&
							(tags.topics as string[]).length > 0 && (
								<p>
									<strong>Topics:</strong>{" "}
									{(tags.topics as string[]).join(", ")}
								</p>
							)}
						{tags.vocalType != null && (
							<p>
								<strong>Vocal:</strong> {String(tags.vocalType)}
							</p>
						)}
						{tags.language != null && (
							<p>
								<strong>Language:</strong> {String(tags.language)}
							</p>
						)}
						{tags.era != null && (
							<p>
								<strong>Era:</strong> {String(tags.era)}
							</p>
						)}
					</Section>
				)}

				{track.lyrics && (
					<Section title="Lyrics">
						<Button
							variant="outline"
							size="xs"
							onClick={() => setShowLyrics((s) => !s)}
						>
							{showLyrics ? "Hide" : "Show"} Lyrics
						</Button>
						{showLyrics && (
							<pre className="mt-2 max-h-[300px] overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
								{track.lyrics}
							</pre>
						)}
					</Section>
				)}

				<Section title="Metadata">
					<p>
						<strong>ID:</strong> <span className="font-mono">{track.id}</span>
					</p>
					{track.durationMs && (
						<p>
							<strong>Duration:</strong> {Math.floor(track.durationMs / 60000)}:
							{String(Math.floor((track.durationMs % 60000) / 1000)).padStart(
								2,
								"0",
							)}
						</p>
					)}
				</Section>
			</div>
		</div>
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<p className="mb-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
				{title}
			</p>
			{children}
		</div>
	);
}

function StatusBadge({
	status,
	type,
}: {
	status: string;
	type: "lyrics";
}) {
	const variants: Record<
		string,
		"default" | "secondary" | "outline" | "destructive"
	> = {
		found: "default",
		not_found: "secondary",
		pending: "outline",
	};

	return (
		<Badge variant={variants[status] ?? "outline"} className="text-[10px]">
			{type === "lyrics" ? `Lyrics: ${status}` : status}
		</Badge>
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
