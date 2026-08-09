import type {
	SpotifyArtistsResponse,
	SpotifyPlaylistSimplified,
	SpotifyPlaylistsResponse,
	SpotifyPlaylistTrackItem,
	SpotifyPlaylistTracksResponse,
	SpotifySavedTracksResponse,
	SpotifyTokenResponse,
} from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { account } from "@harmonia/db/schema/auth";
import { env } from "@harmonia/env/server";
import { logger } from "@harmonia/logger";
import { and, eq } from "drizzle-orm";

import { logExternalApiCall } from "../../external-api-log";
import {
	clearSpotifyNeedsReauth,
	markSpotifyNeedsReauth,
} from "./connection-status";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_RATE_LIMIT_MAX_RETRIES = 3;
const SPOTIFY_RATE_LIMIT_MAX_WAIT_SEC = 60;
const SPOTIFY_PLAYLIST_ITEMS_LIMIT = 50;
const SPOTIFY_PLAYLIST_ITEMS_FIELDS =
	"items(track(id,name,uri,album(id,name,release_date),artists(id,name),duration_ms,explicit,popularity))";

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryParseJson(text: string): unknown {
	if (!text) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

/**
 * `invalid_grant` means the refresh token itself is dead (6-month expiry,
 * #289, or the user revoked access) — distinct from a transient 5xx/429,
 * which should NOT flag the connection as broken.
 */
export function isDeadTokenError(body: unknown): boolean {
	return (
		typeof body === "object" &&
		body !== null &&
		"error" in body &&
		(body as { error?: unknown }).error === "invalid_grant"
	);
}

export type SpotifyCallContext = {
	userId?: string | null;
	pipelineRunId?: number | null;
};

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

	const startTime = Date.now();
	const response = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			Authorization: `Basic ${basicAuth}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body,
	});
	const durationMs = Date.now() - startTime;

	if (!response.ok) {
		const bodyText = await response.text();
		const body = tryParseJson(bodyText) as { error?: string } | undefined;
		const isDeadToken = isDeadTokenError(body);

		logger.error(
			{
				status: response.status,
				statusText: response.statusText,
				spotifyError: body?.error,
				isDeadToken,
				userId,
			},
			"Failed to refresh Spotify access token",
		);
		await logExternalApiCall({
			userId,
			provider: "spotify",
			endpoint: "/token",
			method: "POST",
			httpStatus: response.status,
			durationMs,
			errorMessage: body?.error ?? response.statusText,
		});

		if (isDeadToken) {
			await markSpotifyNeedsReauth(userId);
		}

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

	// A successful refresh proves the connection currently works — clear any
	// stale "needs reauth" flag rather than waiting for the user to reconnect.
	await clearSpotifyNeedsReauth(userId);

	await logExternalApiCall({
		userId,
		provider: "spotify",
		endpoint: "/token",
		method: "POST",
		httpStatus: response.status,
		durationMs,
	});

	return json.access_token;
}

export type SpotifyRequestOptions = {
	method?: "GET" | "POST" | "PUT" | "DELETE";
	body?: unknown;
};

/** Thrown by spotifyRequest for non-ok responses; carries the HTTP status so callers can special-case e.g. 404 (deleted resource) without string-matching the message. */
export class SpotifyApiError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "SpotifyApiError";
		this.status = status;
	}
}

/**
 * Unified Spotify API request helper. Handles auth, 429 retries, and error formatting.
 */
export async function spotifyRequest<T>(
	path: string,
	accessToken: string,
	options: SpotifyRequestOptions = {},
	retriesLeft = SPOTIFY_RATE_LIMIT_MAX_RETRIES,
	context: SpotifyCallContext = {},
): Promise<T | undefined> {
	const { method = "GET", body } = options;
	const init: RequestInit = {
		method,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		...(body !== undefined && { body: JSON.stringify(body) }),
	};

	const retryAttempt = SPOTIFY_RATE_LIMIT_MAX_RETRIES - retriesLeft;
	const startTime = Date.now();
	const response = await fetch(`${SPOTIFY_API_BASE}${path}`, init);
	const durationMs = Date.now() - startTime;

	if (response.status === 429 && retriesLeft > 0) {
		const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
		const waitSec = Math.max(retryAfter, SPOTIFY_RATE_LIMIT_MAX_WAIT_SEC);
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
		await logExternalApiCall({
			userId: context.userId,
			pipelineRunId: context.pipelineRunId,
			provider: "spotify",
			endpoint: path,
			method,
			httpStatus: 429,
			durationMs,
			retryAttempt,
		});
		await sleep(waitSec * 1000);
		return spotifyRequest(path, accessToken, options, retriesLeft - 1, context);
	}

	// Retry transient Spotify server errors (5xx) with exponential backoff.
	// 503 Service Unavailable is the most common; 500/502/504 behave the same way.
	if (response.status >= 500 && retriesLeft > 0) {
		const attempt = SPOTIFY_RATE_LIMIT_MAX_RETRIES - retriesLeft + 1;
		const waitMs = Math.min(1000 * 2 ** attempt, 16000);
		logger.warn(
			{ path, status: response.status, retriesLeft, waitMs },
			"Spotify server error (5xx); retrying with backoff",
		);
		await logExternalApiCall({
			userId: context.userId,
			pipelineRunId: context.pipelineRunId,
			provider: "spotify",
			endpoint: path,
			method,
			httpStatus: response.status,
			durationMs,
			retryAttempt,
		});
		await sleep(waitMs);
		return spotifyRequest(path, accessToken, options, retriesLeft - 1, context);
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
		await logExternalApiCall({
			userId: context.userId,
			pipelineRunId: context.pipelineRunId,
			provider: "spotify",
			endpoint: path,
			method,
			httpStatus: response.status,
			responsePayload: tryParseJson(bodyText) as
				| Record<string, unknown>
				| undefined,
			durationMs,
			errorMessage: summary,
			retryAttempt,
		});
		throw new SpotifyApiError(
			response.status,
			`Spotify API error ${response.status} for ${path}: ${summary}`,
		);
	}

	// Several Spotify endpoints (e.g. PUT /playlists/{id}) return 200/204 with
	// an empty body — response.json() throws "Unexpected end of JSON input" on
	// those, so read as text first and only parse when there's content.
	const responseText = await response.text();

	// responsePayload intentionally omitted on success — saved-track/playlist
	// pages are large; a success row's existence is the useful signal.
	await logExternalApiCall({
		userId: context.userId,
		pipelineRunId: context.pipelineRunId,
		provider: "spotify",
		endpoint: path,
		method,
		httpStatus: response.status,
		durationMs,
		retryAttempt,
	});

	if (!responseText) {
		return undefined;
	}
	return JSON.parse(responseText) as T;
}

// GET endpoints used in this codebase always return a body (paginated list
// responses) — fail loudly rather than silently propagating undefined if
// that assumption is ever wrong, instead of an `as T` cast.
async function spotifyGet<T>(
	path: string,
	accessToken: string,
	context: SpotifyCallContext = {},
): Promise<T> {
	const result = await spotifyRequest<T>(
		path,
		accessToken,
		{ method: "GET" },
		undefined,
		context,
	);
	if (result === undefined) {
		throw new Error(`Spotify GET ${path} returned an empty body`);
	}
	return result;
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
		context?: SpotifyCallContext;
	},
): Promise<SpotifySavedTracksResponse["items"]> {
	const limit = 50;
	let url = `/me/tracks?limit=${limit}`;
	const allItems: SpotifySavedTracksResponse["items"] = [];
	let pageIndex = 0;
	let reportedTotal: number | undefined;

	for (;;) {
		const page = await spotifyGet<SpotifySavedTracksResponse>(
			url,
			accessToken,
			options?.context,
		);
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
	options?: { ownerId?: string; context?: SpotifyCallContext },
): Promise<SpotifyPlaylistSimplified[]> {
	const limit = 50;
	let url = `/me/playlists?limit=${limit}`;
	const allPlaylists: SpotifyPlaylistSimplified[] = [];

	for (;;) {
		const page = await spotifyGet<SpotifyPlaylistsResponse>(
			url,
			accessToken,
			options?.context,
		);
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

export async function fetchPlaylistItems(
	accessToken: string,
	playlistId: string,
	options?: { fields?: string; context?: SpotifyCallContext },
): Promise<SpotifyPlaylistTrackItem[]> {
	const fields = options?.fields ?? SPOTIFY_PLAYLIST_ITEMS_FIELDS;
	let url = `/playlists/${playlistId}/items?limit=${SPOTIFY_PLAYLIST_ITEMS_LIMIT}&fields=${encodeURIComponent(fields)}`;
	const allItems: SpotifyPlaylistTrackItem[] = [];

	for (;;) {
		const page = await spotifyGet<SpotifyPlaylistTracksResponse>(
			url,
			accessToken,
			options?.context,
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
	context?: SpotifyCallContext,
): Promise<SpotifyPlaylistTrackItem[]> {
	return fetchPlaylistItems(accessToken, playlistId, { context });
}

const ARTISTS_BATCH_SIZE = 50; // GET /artists max ids per request

export async function fetchArtistsByIds(
	accessToken: string,
	artistIds: string[],
	context: SpotifyCallContext = {},
): Promise<Array<{ id: string; name: string; imageUrl: string | null }>> {
	const results: Array<{ id: string; name: string; imageUrl: string | null }> =
		[];

	for (let i = 0; i < artistIds.length; i += ARTISTS_BATCH_SIZE) {
		const batch = artistIds.slice(i, i + ARTISTS_BATCH_SIZE);
		const page = await spotifyGet<SpotifyArtistsResponse>(
			`/artists?ids=${batch.join(",")}`,
			accessToken,
			context,
		);
		for (const a of page.artists) {
			if (!a) continue;
			results.push({
				id: a.id,
				name: a.name,
				imageUrl: a.images?.[0]?.url ?? null,
			});
		}
	}

	return results;
}
