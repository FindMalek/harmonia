import { logger } from "@harmonia/logger";
import pRetry, { AbortError } from "p-retry";
import { logExternalApiCall } from "../../external-api-log";

export type LRCLibCallContext = {
	userId?: string | null;
	pipelineRunId?: number | null;
};

function tryParseJson(text: string): unknown {
	if (!text) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

type LRCLibTrack = {
	id: number;
	plainLyrics: string | null;
	syncedLyrics: string | null;
	instrumental: boolean;
};

type LRCLibRawTrack = {
	id: number;
	plainLyrics?: string | null;
	syncedLyrics?: string | null;
	instrumental?: boolean;
};

// Base retry config — no onFailedAttempt here so each call site can close over its url.
const RETRY_BASE = {
	retries: 3,
	minTimeout: 2000,
	factor: 2,
	randomize: true, // jitter prevents synchronised retry waves across concurrent workers
} as const;

function toTrack(raw: LRCLibRawTrack): LRCLibTrack {
	return {
		id: raw.id,
		plainLyrics: raw.plainLyrics ?? null,
		syncedLyrics: raw.syncedLyrics ?? null,
		instrumental: raw.instrumental ?? false,
	};
}

// Generic helper used by both /api/get (T = LRCLibRawTrack) and /api/search (T = LRCLibRawTrack[]).
// url is closed over so the retry log always carries request context.
async function fetchLRCLib<T = LRCLibRawTrack>(
	url: string,
	endpoint: "/api/get" | "/api/search",
	context: LRCLibCallContext = {},
): Promise<T | null> {
	let attempt = 0;
	return pRetry(
		async () => {
			const retryAttempt = attempt;
			attempt += 1;
			const params = Object.fromEntries(new URL(url).searchParams);
			const startTime = Date.now();
			const response = await fetch(url);
			const durationMs = Date.now() - startTime;

			if (response.status === 404) {
				await logExternalApiCall({
					userId: context.userId,
					pipelineRunId: context.pipelineRunId,
					provider: "lrclib",
					endpoint,
					method: "GET",
					httpStatus: 404,
					requestPayload: params,
					durationMs,
					retryAttempt,
				});
				return null;
			}

			if (!response.ok) {
				const bodyText = await response.clone().text();
				const message = `LRCLib ${response.status}: ${response.statusText}`;
				await logExternalApiCall({
					userId: context.userId,
					pipelineRunId: context.pipelineRunId,
					provider: "lrclib",
					endpoint,
					method: "GET",
					httpStatus: response.status,
					requestPayload: params,
					responsePayload: tryParseJson(bodyText) as
						| Record<string, unknown>
						| undefined,
					durationMs,
					errorMessage: message,
					retryAttempt,
				});
				// 429 is rate-limited but transient — must NOT abort, let backoff handle it
				if (
					response.status !== 429 &&
					response.status >= 400 &&
					response.status < 500
				) {
					throw new AbortError(message);
				}
				// 429 and 5xx — retried with exponential back-off + jitter
				throw new Error(message);
			}

			await logExternalApiCall({
				userId: context.userId,
				pipelineRunId: context.pipelineRunId,
				provider: "lrclib",
				endpoint,
				method: "GET",
				httpStatus: response.status,
				requestPayload: params,
				durationMs,
				retryAttempt,
			});

			return (await response.json()) as T;
		},
		{
			...RETRY_BASE,
			onFailedAttempt: (error) => {
				logger.debug(
					{ attempt: error.attemptNumber, retriesLeft: error.retriesLeft, url },
					"LRCLib request failed, retrying",
				);
			},
		},
	);
}

export async function getLyricsFromLRCLib(
	params: {
		trackName: string;
		artistName: string;
		albumName?: string | null;
		durationMs?: number | null;
	},
	context: LRCLibCallContext = {},
): Promise<LRCLibTrack | null> {
	// ── 1. Exact-match via /api/get ──────────────────────────────────────────
	const getParams = new URLSearchParams({
		track_name: params.trackName,
		artist_name: params.artistName,
	});
	if (params.albumName) getParams.set("album_name", params.albumName);
	if (params.durationMs && Number.isFinite(params.durationMs)) {
		getParams.set("duration", Math.round(params.durationMs / 1000).toString());
	}

	const exact = await fetchLRCLib<LRCLibRawTrack>(
		`https://lrclib.net/api/get?${getParams.toString()}`,
		"/api/get",
		context,
	);
	if (exact) return toTrack(exact);

	// ── 2. Fuzzy fallback via /api/search ────────────────────────────────────
	// /api/get 404s on variant spellings or missing duration; /api/search is lenient.
	const searchParams = new URLSearchParams({
		track_name: params.trackName,
		artist_name: params.artistName,
	});

	const results = await fetchLRCLib<LRCLibRawTrack[]>(
		`https://lrclib.net/api/search?${searchParams.toString()}`,
		"/api/search",
		context,
	);

	// results is null (404) or LRCLibRawTrack[]; optional-chain handles both
	const first = results?.[0];
	return first ? toTrack(first) : null;
}
