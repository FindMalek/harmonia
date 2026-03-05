import { db } from "@harmonia/db";
import { account } from "@harmonia/db/schema/auth";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { and, eq } from "drizzle-orm";

import type { SpotifySavedTracksResponse } from "./types";

type SpotifyTokenResponse = {
	access_token: string;
	expires_in: number;
	scope?: string;
	token_type: string;
};

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

async function getSpotifyAccount(userId: string) {
	const rows = await db
		.select()
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, "spotify")))
		.limit(1);

	return rows[0] ?? null;
}

export async function getUserSpotifyAccessToken(
	userId: string,
): Promise<string | null> {
	const spotifyAccount = await getSpotifyAccount(userId);

	if (!spotifyAccount) {
		logger.info({ userId }, "No Spotify account linked; skipping sync");
		return null;
	}

	const now = new Date();

	if (
		spotifyAccount.accessToken &&
		spotifyAccount.accessTokenExpiresAt &&
		spotifyAccount.accessTokenExpiresAt.getTime() - now.getTime() > 60_000
	) {
		return spotifyAccount.accessToken;
	}

	if (!spotifyAccount.refreshToken) {
		logger.warn(
			{ userId },
			"Spotify account missing refresh token; cannot refresh access token",
		);
		return null;
	}

	const clientId = env.SPOTIFY_CLIENT_ID;
	const clientSecret = env.SPOTIFY_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		logger.warn(
			{ userId },
			"Spotify client credentials not configured; cannot refresh token",
		);
		return null;
	}

	const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
		"base64",
	);

	const body = new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: spotifyAccount.refreshToken,
	});

	const response = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			Authorization: `Basic ${basicAuth}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body,
	});

	if (!response.ok) {
		logger.error(
			{
				status: response.status,
				statusText: response.statusText,
				userId,
			},
			"Failed to refresh Spotify access token",
		);
		return null;
	}

	const json = (await response.json()) as SpotifyTokenResponse;
	const expiresAt = new Date(now.getTime() + json.expires_in * 1000);

	await db
		.update(account)
		.set({
			accessToken: json.access_token,
			accessTokenExpiresAt: expiresAt,
		})
		.where(and(eq(account.userId, userId), eq(account.providerId, "spotify")));

	return json.access_token;
}

async function spotifyFetch<T>(
	path: string,
	accessToken: string,
	init?: RequestInit,
): Promise<T> {
	const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
			...(init?.headers ?? {}),
		},
	});

	if (!response.ok) {
		const bodyText = await response.text();
		let bodyJson: { error?: unknown; error_description?: unknown } = {};
		try {
			bodyJson = bodyText ? (JSON.parse(bodyText) as typeof bodyJson) : {};
		} catch {
			// ignore parse errors
		}
		logger.error(
			{ status: response.status, path, body: bodyJson },
			"Spotify API error",
		);
		if (response.status === 403) {
			logger.warn(
				{ path },
				"Spotify 403: token may lack user-library-read. Sign out and sign in again with Spotify to re-authorize.",
			);
		}
		const rawSummary =
			bodyJson.error_description ?? bodyJson.error ?? response.statusText;
		const summary =
			typeof rawSummary === "string" ? rawSummary : JSON.stringify(rawSummary);
		throw new Error(
			`Spotify API error ${response.status} for ${path}: ${summary}`,
		);
	}

	return (await response.json()) as T;
}

export async function fetchAllSavedTracks(
	accessToken: string,
): Promise<SpotifySavedTracksResponse["items"]> {
	const limit = 50;
	let url = `/me/tracks?limit=${limit}`;
	const allItems: SpotifySavedTracksResponse["items"] = [];

	// Basic paging loop
	for (;;) {
		const page = await spotifyFetch<SpotifySavedTracksResponse>(
			url,
			accessToken,
		);
		allItems.push(...page.items);

		if (!page.next) {
			break;
		}

		// next is a full URL; extract path + query relative to SPOTIFY_API_BASE
		// (strip /v1 prefix to avoid double /v1/v1/ when prepending base)
		const nextUrl = new URL(page.next);
		let path = nextUrl.pathname;
		if (path.startsWith("/v1/")) path = path.slice(3);
		url = path + nextUrl.search;
	}

	return allItems;
}

/**
 * @deprecated Spotify restricted /audio-features to Extended Quota apps (Nov 27, 2024).
 * Apps without Extended Quota get 403. Uncomment below to re-enable when quota is granted.
 *
 * Alternative providers for audio features (valence, energy, danceability, tempo, etc.):
 * - AcousticBrainz (free, uses MusicBrainz MBID): https://acousticbrainz.org/api
 *   Requires Spotify ID → MBID mapping via ISRC or MusicBrainz search.
 * - Soundcharts (paid): BPM, key, energy, valence, danceability — catalog-based.
 * - ReccoBeats (upload-based): https://reccobeats.com — requires audio files (MP3/WAV).
 */
// export async function fetchAudioFeatures(
// 	trackIds: string[],
// 	accessToken: string,
// ): Promise<SpotifyAudioFeatures[]> {
// 	if (trackIds.length === 0) return [];
//
// 	const batches: string[][] = [];
// 	for (let i = 0; i < trackIds.length; i += 100) {
// 		batches.push(trackIds.slice(i, i + 100));
// 	}
//
// 	const allFeatures: SpotifyAudioFeatures[] = [];
//
// 	for (const batch of batches) {
// 		const params = new URLSearchParams({
// 			ids: batch.join(","),
// 		});
//
// 		const { audio_features } = await spotifyFetch<{
// 			audio_features: (SpotifyAudioFeatures | null)[];
// 		}>(`/audio-features?${params.toString()}`, accessToken);
//
// 		const filtered = (audio_features ?? []).filter(
// 			(f): f is SpotifyAudioFeatures => f != null,
// 		);
// 		allFeatures.push(...filtered);
// 	}
//
// 	return allFeatures;
// }
