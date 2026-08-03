"use client";

import type { TrackGetByIdOutput } from "@harmonia/common/schemas";
import { parseJsonStringArray } from "@harmonia/common/utils/parse-json-string-array";
import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import {
	Badge,
	Icons,
	Progress,
	Separator,
	Skeleton,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@harmonia/ui";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { DashboardDetailBackLink } from "@/components/shared/dashboard-detail-back-link";

const AUDIO_FEATURES: Array<{
	key: keyof Pick<
		TrackGetByIdOutput,
		| "valence"
		| "energy"
		| "danceability"
		| "acousticness"
		| "instrumentalness"
		| "speechiness"
		| "liveness"
	>;
	label: string;
}> = [
	{ key: "valence", label: "Valence" },
	{ key: "energy", label: "Energy" },
	{ key: "danceability", label: "Danceability" },
	{ key: "acousticness", label: "Acousticness" },
	{ key: "instrumentalness", label: "Instrumentalness" },
	{ key: "speechiness", label: "Speechiness" },
	{ key: "liveness", label: "Liveness" },
];

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

function formatDate(value: Date | null): string {
	if (!value) return "—";
	return new Date(value).toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export function DashboardTrackDetail({ track }: { track: TrackGetByIdOutput }) {
	const artists = parseJsonStringArray(track.artistNames);
	const themes = track.llmTags?.themes ?? [];
	const topics = track.llmTags?.topics ?? [];
	const vibe = track.llmTags?.vibe ?? [];
	const secondaryMoods = track.llmTags?.secondaryMoods ?? [];

	return (
		<div className="flex flex-col gap-6">
			<DashboardDetailBackLink
				href={DASHBOARD_ROUTES.playlists.path}
				label="Playlists"
			/>

			<div className="flex flex-col items-start gap-4 sm:flex-row">
				{track.albumImageUrl ? (
					<Image
						src={track.albumImageUrl}
						alt=""
						width={160}
						height={160}
						className="size-40 shrink-0 rounded object-cover"
						unoptimized
					/>
				) : (
					<div className="size-40 shrink-0 rounded bg-muted" />
				)}
				<div className="min-w-0 flex-1">
					<h1 className="font-bold text-2xl tracking-tight">{track.name}</h1>
					<p className="mt-1 text-muted-foreground">{artists.join(", ")}</p>
					{track.albumName ? (
						<p className="text-muted-foreground text-sm">{track.albumName}</p>
					) : null}
					<p className="mt-2 text-muted-foreground text-sm">
						{formatDuration(track.durationMs)}
					</p>
					<a
						href={track.spotifyUri.replace(
							"spotify:track:",
							"https://open.spotify.com/track/",
						)}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-2 inline-flex items-center gap-1 text-sm underline underline-offset-4"
					>
						Open in Spotify
						<Icons.externalLink className="size-3" />
					</a>
				</div>
			</div>

			<Separator />

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-sm uppercase tracking-widest">
					Analysis
				</h2>
				<div className="flex flex-wrap items-center gap-2">
					{track.llmMood ? (
						<Badge variant="secondary">{track.llmMood}</Badge>
					) : null}
					{secondaryMoods.map((mood) => (
						<Badge key={mood} variant="outline">
							{mood}
						</Badge>
					))}
					{track.genreDomainName ? (
						<Badge variant="outline">{track.genreDomainName}</Badge>
					) : null}
				</div>
				{themes.length > 0 || topics.length > 0 || vibe.length > 0 ? (
					<div className="flex flex-col gap-1 text-muted-foreground text-sm">
						{themes.length > 0 ? <p>Themes: {themes.join(", ")}</p> : null}
						{topics.length > 0 ? <p>Topics: {topics.join(", ")}</p> : null}
						{vibe.length > 0 ? <p>Vibe: {vibe.join(", ")}</p> : null}
					</div>
				) : null}

				<div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
					{AUDIO_FEATURES.map((feature) => {
						const value = track[feature.key];
						return (
							<div key={feature.key} className="flex flex-col gap-1">
								<div className="flex items-center justify-between text-xs">
									<span className="text-muted-foreground">{feature.label}</span>
									<span>{value != null ? value.toFixed(2) : "—"}</span>
								</div>
								<Progress value={value != null ? value * 100 : 0} />
							</div>
						);
					})}
				</div>
				<div className="flex flex-wrap gap-4 text-muted-foreground text-xs">
					<span>
						Tempo:{" "}
						{track.tempo != null ? `${Math.round(track.tempo)} BPM` : "—"}
					</span>
					<span>
						Key: {track.key != null ? (KEY_NAMES[track.key] ?? "—") : "—"}
					</span>
					<span>
						Mode:{" "}
						{track.mode === 1 ? "Major" : track.mode === 0 ? "Minor" : "—"}
					</span>
				</div>
			</section>

			<Separator />

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-sm uppercase tracking-widest">
					Lyrics
				</h2>
				{track.lyricsInstrumental ? (
					<Badge variant="outline">Instrumental</Badge>
				) : track.lyrics || track.syncedLyrics ? (
					<Tabs defaultValue="plain">
						<TabsList>
							<TabsTrigger value="plain" disabled={!track.lyrics}>
								Plain
							</TabsTrigger>
							<TabsTrigger value="synced" disabled={!track.syncedLyrics}>
								Synced
							</TabsTrigger>
						</TabsList>
						<TabsContent value="plain">
							<pre className="whitespace-pre-wrap font-sans text-sm">
								{track.lyrics ?? "No plain lyrics available."}
							</pre>
						</TabsContent>
						<TabsContent value="synced">
							<pre className="whitespace-pre-wrap font-sans text-sm">
								{track.syncedLyrics ?? "No synced lyrics available."}
							</pre>
						</TabsContent>
					</Tabs>
				) : (
					<p className="text-muted-foreground text-sm">
						{track.lyricsStatus === "pending"
							? "Lyrics not fetched yet."
							: "No lyrics found for this track."}
					</p>
				)}
			</section>

			<Separator />

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-sm uppercase tracking-widest">
					Liked
				</h2>
				<p className="text-muted-foreground text-sm">
					{track.likedAt
						? `Saved on Spotify on ${formatDate(track.likedAt)}`
						: "Not in your Liked Songs."}
				</p>
			</section>

			<Separator />

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-sm uppercase tracking-widest">
					Playlists
				</h2>
				<div className="flex flex-col gap-2">
					<p className="text-muted-foreground text-xs uppercase tracking-widest">
						In Harmonia
					</p>
					{track.harmoniaPlaylists.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{track.harmoniaPlaylists.map((pl) => (
								<li key={pl.id}>
									<Link
										href={
											DASHBOARD_ROUTES.playlists.children.detail.makePath(
												String(pl.id),
											) as Route
										}
										className="text-sm underline underline-offset-4"
									>
										{pl.name}
									</Link>
								</li>
							))}
						</ul>
					) : (
						<p className="text-muted-foreground text-sm">
							Not in any Harmonia playlist.
						</p>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<p className="text-muted-foreground text-xs uppercase tracking-widest">
						On Spotify
					</p>
					{track.spotifyPlaylists.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{track.spotifyPlaylists.map((pl) => (
								<li key={pl.id}>
									<a
										href={`https://open.spotify.com/playlist/${pl.id}`}
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm underline underline-offset-4"
									>
										{pl.name}
									</a>
								</li>
							))}
						</ul>
					) : (
						<p className="text-muted-foreground text-sm">
							Not in any of your Spotify playlists.
						</p>
					)}
				</div>
			</section>
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
				<Skeleton className="size-40 shrink-0 rounded" />
				<div className="flex flex-1 flex-col gap-2">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-4 w-32" />
				</div>
			</div>
			<Skeleton className="h-40 w-full" />
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
