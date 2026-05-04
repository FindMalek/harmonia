import { db } from "@harmonia/db";
import { account } from "@harmonia/db/schema/auth";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { and, eq } from "drizzle-orm";

import type {
	SpotifyPlaylistSimplified,
	SpotifyPlaylistTrackItem,
	SpotifyPlaylistTracksResponse,
	SpotifyPlaylistsResponse,
	SpotifySavedTracksResponse,
	SpotifyTokenResponse,
} from "@harmonia/common/schemas";

export const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const RATE_LIMIT_MAX_RETRIES = 3;
const RATE_LIMIT_MAX_WAIT_SEC = 60;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getSpotifyAccount(userId: string) {
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

	const clientId = env.HARMONIA_SPOTIFY_CLIENT_ID;
	const clientSecret = env.HARMONIA_SPOTIFY_CLIENT_SECRET;

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

export type SpotifyRequestOptions = {
	method?: "GET" | "POST" | "PUT" | "DELETE";
	body?: unknown;
};

/**
 * Unified Spotify API request helper. Handles auth, 429 retries, and error formatting.
 */
export async function spotifyRequest<T>(
	path: string,
	accessToken: string,
	options: SpotifyRequestOptions = {},
	retriesLeft = RATE_LIMIT_MAX_RETRIES,
): Promise<T> {
	const { method = "GET", body } = options;
	const init: RequestInit = {
		method,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		...(body !== undefined && { body: JSON.stringify(body) }),
	};

	const response = await fetch(`${SPOTIFY_API_BASE}${path}`, init);

	if (response.status === 429 && retriesLeft > 0) {
		const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
		const waitSec = Math.max(retryAfter, RATE_LIMIT_MAX_WAIT_SEC);
		logger.warn(
			{
				path,
				waitSec,
				retriesLeft,
				error: response.statusText,
				response,
				retryAfter,
			},
			"Spotify rate limit (429); waiting before retry",
		);
		await sleep(waitSec);
		return spotifyRequest(path, accessToken, options, retriesLeft - 1);
	}

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

function spotifyGet<T>(path: string, accessToken: string): Promise<T> {
	return spotifyRequest<T>(path, accessToken, { method: "GET" });
}

export function spotifyRelativePathFromNext(nextUrl: string): string {
	const parsed = new URL(nextUrl, SPOTIFY_API_BASE);
	let resourcePath = parsed.pathname;
	if (resourcePath.startsWith("/v1/")) {
		resourcePath = resourcePath.slice("/v1".length);
	}
	return `${resourcePath}${parsed.search}`;
}

export type FetchSavedTracksOnPageArgs = {
	items: SpotifySavedTracksResponse["items"];
	cumulativeTrackCount: number;
	total: number | undefined;
	pageIndex: number;
	hasNext: boolean;
};

export async function fetchAllSavedTracks(
	accessToken: string,
	options?: {
		onPage?: (args: FetchSavedTracksOnPageArgs) => void | Promise<void>;
	},
): Promise<SpotifySavedTracksResponse["items"]> {
	const limit = 50;
	let url = `/me/tracks?limit=${limit}`;
	const allItems: SpotifySavedTracksResponse["items"] = [];
	let pageIndex = 0;
	let reportedTotal: number | undefined;

	for (;;) {
		const page = await spotifyGet<SpotifySavedTracksResponse>(url, accessToken);
		if (typeof page.total === "number") {
			reportedTotal = page.total;
		}
		allItems.push(...page.items);
		const cumulativeTrackCount = allItems.length;
		const hasNext = Boolean(page.next);

		await options?.onPage?.({
			items: page.items,
			cumulativeTrackCount,
			total: page.total,
			pageIndex,
			hasNext,
		});

		if (!page.next) {
			break;
		}

		url = spotifyRelativePathFromNext(page.next);
		pageIndex += 1;
	}

	if (reportedTotal !== undefined && allItems.length !== reportedTotal) {
		logger.warn(
			{ collected: allItems.length, total: reportedTotal },
			"Spotify saved tracks page total does not match collected items after pagination",
		);
	}

	return allItems;
}

export async function fetchAllUserPlaylists(
	accessToken: string,
	options?: { ownerId?: string },
): Promise<SpotifyPlaylistSimplified[]> {
	const limit = 50;
	let url = `/me/playlists?limit=${limit}`;
	const allPlaylists: SpotifyPlaylistSimplified[] = [];

	for (;;) {
		const page = await spotifyGet<SpotifyPlaylistsResponse>(url, accessToken);
		allPlaylists.push(...page.items);

		if (!page.next) {
			break;
		}

		url = spotifyRelativePathFromNext(page.next);
	}

	const ownerId = options?.ownerId;
	if (ownerId) {
		return allPlaylists.filter((p) => p.owner?.id === ownerId);
	}
	return allPlaylists;
}

const PLAYLIST_ITEMS_LIMIT = 50;
const PLAYLIST_ITEMS_FIELDS =
	"items(track(id,name,uri,album(id,name),artists(id,name),duration_ms))";

export async function fetchPlaylistItems(
	accessToken: string,
	playlistId: string,
	options?: { fields?: string },
): Promise<SpotifyPlaylistTrackItem[]> {
	const fields = options?.fields ?? PLAYLIST_ITEMS_FIELDS;
	let url = `/playlists/${playlistId}/items?limit=${PLAYLIST_ITEMS_LIMIT}&fields=${encodeURIComponent(fields)}`;
	const allItems: SpotifyPlaylistTrackItem[] = [];

	for (;;) {
		const page = await spotifyGet<SpotifyPlaylistTracksResponse>(
			url,
			accessToken,
		);
		allItems.push(...page.items);

		if (!page.next) {
			break;
		}

		url = spotifyRelativePathFromNext(page.next);
	}

	return allItems;
}

export async function fetchAllPlaylistTracks(
	accessToken: string,
	playlistId: string,
): Promise<SpotifyPlaylistTrackItem[]> {
	return fetchPlaylistItems(accessToken, playlistId);
}
