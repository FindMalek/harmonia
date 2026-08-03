"use client";

import type { TrackGetByIdOutput } from "@harmonia/common/schemas";
import { parseJsonStringArray } from "@harmonia/common/utils/parse-json-string-array";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import {
	Button,
	cn,
	Icons,
	InsightSectionCard,
	InsightStatCard,
	Skeleton,
} from "@harmonia/ui";
import { format } from "date-fns";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { DashboardDetailBackLink } from "@/components/shared/dashboard-detail-back-link";
import { DashboardInsightsSonicDna } from "./dashboard-insights-sonic-dna";

const KEY_NAMES = [
	"C",
	"C♯/D♭",
	"D",
	"D♯/E♭",
	"E",
	"F",
	"F♯/G♭",
	"G",
	"G♯/A♭",
	"A",
	"A♯/B♭",
	"B",
];

function formatDuration(ms: number | null): string {
	if (ms == null) return "—";
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Matches the label/value row style used across insight cards (e.g. dashboard-insights-personality.tsx). */
function KvRow({ label, value }: { label: string; value: string | null }) {
	return (
		<div className="flex items-center justify-between border-border border-b py-3 last:border-b-0">
			<span className="text-[11px] text-muted-foreground">{label}</span>
			<span className="text-foreground text-sm capitalize">{value ?? "—"}</span>
		</div>
	);
}

/** Matches the hashtag-style tag used for vibes on dashboard-insights-mood-vibe.tsx. */
function Tag({ label }: { label: string }) {
	return (
		<span className="border border-border bg-muted px-2.5 py-1.5 text-[11px] text-foreground lowercase">
			<span className="text-accent">#</span>
			{label}
		</span>
	);
}

export function DashboardTrackDetail({ track }: { track: TrackGetByIdOutput }) {
	const [lyricsView, setLyricsView] = useState<"plain" | "synced">("plain");
	const artists = parseJsonStringArray(track.artistNames);
	const themes = track.llmTags?.themes ?? [];
	const topics = track.llmTags?.topics ?? [];
	const vibe = track.llmTags?.vibe ?? [];
	const secondaryMoods = track.llmTags?.secondaryMoods ?? [];
	const hasTags = themes.length > 0 || topics.length > 0 || vibe.length > 0;
	const hasLyrics = Boolean(track.lyrics || track.syncedLyrics);

	return (
		<div className="flex flex-col gap-6">
			<DashboardDetailBackLink
				href={DASHBOARD_ROUTES.playlists.path}
				label="Playlists"
			/>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col items-start gap-4 sm:flex-row">
					{track.albumImageUrl ? (
						<Image
							src={track.albumImageUrl}
							alt=""
							width={224}
							height={224}
							className="size-44 shrink-0 sm:size-56"
							unoptimized
						/>
					) : (
						<div className="size-44 shrink-0 bg-muted sm:size-56" />
					)}
					<div className="flex min-w-0 flex-1 flex-col gap-1 sm:pt-2">
						<h1 className="font-bold text-2xl tracking-tight">{track.name}</h1>
						<p className="inline-flex flex-wrap items-center gap-1 text-muted-foreground">
							{artists.map((name, index) => {
								const artistId = track.artistIds?.[index];
								return (
									<span key={`${name}-${index}`}>
										{index > 0 ? ", " : ""}
										{artistId ? (
											<a
												href={`https://open.spotify.com/artist/${artistId}`}
												target="_blank"
												rel="noopener noreferrer"
												className="hover:text-primary hover:underline"
											>
												{name}
											</a>
										) : (
											name
										)}
									</span>
								);
							})}
							{track.artistIds?.some(Boolean) ? (
								<Icons.externalLink className="size-3" />
							) : null}
						</p>
						{track.albumName ? (
							track.albumId ? (
								<a
									href={`https://open.spotify.com/album/${track.albumId}`}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex w-fit items-center gap-1 text-muted-foreground text-sm hover:text-primary hover:underline"
								>
									{track.albumName}
									<Icons.externalLink className="size-3" />
								</a>
							) : (
								<p className="text-muted-foreground text-sm">
									{track.albumName}
								</p>
							)
						) : null}
					</div>
				</div>
				<a
					href={track.spotifyUri.replace(
						"spotify:track:",
						"https://open.spotify.com/track/",
					)}
					target="_blank"
					rel="noopener noreferrer"
					className="shrink-0"
				>
					<Button className="w-full bg-primary font-bold text-primary-foreground uppercase tracking-widest hover:bg-primary/90 sm:w-auto">
						Open in Spotify
						<Icons.externalLink className="ml-2 size-4" />
					</Button>
				</a>
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<InsightStatCard
					label="Duration"
					value={formatDuration(track.durationMs)}
				/>
				<InsightStatCard
					label="Tempo"
					value={track.tempo != null ? `${Math.round(track.tempo)} BPM` : "—"}
				/>
				<InsightStatCard
					label="Key"
					value={track.key != null ? (KEY_NAMES[track.key] ?? "—") : "—"}
				/>
				<InsightStatCard
					label="Mode"
					value={track.mode === 1 ? "Major" : track.mode === 0 ? "Minor" : "—"}
				/>
			</div>

			<DashboardInsightsSonicDna
				dna={{
					valence: track.valence,
					energy: track.energy,
					danceability: track.danceability,
					acousticness: track.acousticness,
					instrumentalness: track.instrumentalness,
					speechiness: track.speechiness,
					liveness: track.liveness,
				}}
			/>

			<InsightSectionCard title="Mood & Themes">
				<div>
					<KvRow label="Mood" value={track.llmMood} />
					<KvRow label="Genre domain" value={track.genreDomainName} />
					{secondaryMoods.length > 0 ? (
						<KvRow label="Secondary moods" value={secondaryMoods.join(", ")} />
					) : null}
				</div>
				{hasTags ? (
					<div className="flex flex-wrap gap-2">
						{[...new Set([...vibe, ...themes, ...topics])].map((tag) => (
							<Tag key={tag} label={tag} />
						))}
					</div>
				) : null}
			</InsightSectionCard>

			<InsightSectionCard title="Lyrics">
				{track.lyricsInstrumental ? (
					<p className="text-muted-foreground text-sm">
						Instrumental — no lyrics.
					</p>
				) : hasLyrics ? (
					<div className="flex flex-col gap-3">
						<div className="flex gap-2">
							<button
								type="button"
								disabled={!track.lyrics}
								onClick={() => setLyricsView("plain")}
								className={cn(
									"border border-border px-3 py-1.5 text-[11px] uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-40",
									lyricsView === "plain"
										? "bg-primary text-primary-foreground"
										: "text-muted-foreground",
								)}
							>
								Plain
							</button>
							<button
								type="button"
								disabled={!track.syncedLyrics}
								onClick={() => setLyricsView("synced")}
								className={cn(
									"border border-border px-3 py-1.5 text-[11px] uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-40",
									lyricsView === "synced"
										? "bg-primary text-primary-foreground"
										: "text-muted-foreground",
								)}
							>
								Synced
							</button>
						</div>
						<pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
							{(lyricsView === "plain" ? track.lyrics : track.syncedLyrics) ??
								"Not available."}
						</pre>
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						{track.lyricsStatus === "pending"
							? "Lyrics not fetched yet."
							: "No lyrics found for this track."}
					</p>
				)}
			</InsightSectionCard>

			<InsightSectionCard title="Liked">
				<KvRow
					label="Saved on Spotify"
					value={track.likedAt ? format(track.likedAt, "MMMM d, yyyy") : null}
				/>
			</InsightSectionCard>

			<InsightSectionCard title="Playlists">
				<div className="flex flex-col gap-2">
					<span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
						In Harmonia
					</span>
					{track.harmoniaPlaylists.length > 0 ? (
						<div>
							{track.harmoniaPlaylists.map((pl) => (
								<Link
									key={pl.id}
									href={
										DASHBOARD_ROUTES.playlists.children.detail.makePath(
											String(pl.id),
										) as Route
									}
									className="flex items-center justify-between border-border border-b py-3 text-sm last:border-b-0 hover:text-primary"
								>
									{pl.name}
									<Icons.arrowUpRight className="size-3.5 shrink-0" />
								</Link>
							))}
						</div>
					) : (
						<p className="py-3 text-muted-foreground text-sm">
							Not in any Harmonia playlist.
						</p>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
						On Spotify
					</span>
					{track.spotifyPlaylists.length > 0 ? (
						<div>
							{track.spotifyPlaylists.map((pl) => (
								<a
									key={pl.id}
									href={`https://open.spotify.com/playlist/${pl.id}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center justify-between border-border border-b py-3 text-sm last:border-b-0 hover:text-primary"
								>
									{pl.name}
									<Icons.externalLink className="size-3.5 shrink-0" />
								</a>
							))}
						</div>
					) : (
						<p className="py-3 text-muted-foreground text-sm">
							Not in any of your Spotify playlists.
						</p>
					)}
				</div>
			</InsightSectionCard>
		</div>
	);
}

export function DashboardTrackDetailSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<Skeleton className="h-3 w-20" />
				<Skeleton className="h-px w-full" />
			</div>
			<div className="flex gap-4">
				<Skeleton className="size-44 shrink-0 sm:size-56" />
				<div className="flex flex-1 flex-col gap-2">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-4 w-32" />
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{["duration", "tempo", "key", "mode"].map((key) => (
					<Skeleton key={key} className="h-20 w-full" />
				))}
			</div>
			<Skeleton className="h-48 w-full" />
			<Skeleton className="h-40 w-full" />
		</div>
	);
}

export function DashboardTrackDetailNotFound() {
	return (
		<div className="flex flex-col gap-6">
			<DashboardDetailBackLink
				href={DASHBOARD_ROUTES.playlists.path}
				label="Playlists"
			/>
			<p className="text-muted-foreground text-sm">Track not found.</p>
		</div>
	);
}
