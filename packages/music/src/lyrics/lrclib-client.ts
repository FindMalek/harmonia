import { logger } from "@harmonia/logger";

type LRCLibTrack = {
	id: number;
	plainLyrics: string | null;
	syncedLyrics: string | null;
	instrumental: boolean;
};

export async function getLyricsFromLRCLib(params: {
	trackName: string;
	artistName: string;
	albumName?: string | null;
	durationMs?: number | null;
}): Promise<LRCLibTrack | null> {
	const searchParams = new URLSearchParams({
		track_name: params.trackName,
		artist_name: params.artistName,
	});

	if (params.albumName) {
		searchParams.set("album_name", params.albumName);
	}

	if (params.durationMs && Number.isFinite(params.durationMs)) {
		searchParams.set("duration", Math.round(params.durationMs / 1000).toString());
	}

	const url = `https://lrclib.net/api/get?${searchParams.toString()}`;

	const response = await fetch(url);

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		logger.warn(
			{
				status: response.status,
				statusText: response.statusText,
				url,
			},
			"LRCLib request failed",
		);

		return null;
	}

	const json = (await response.json()) as {
		id: number;
		plainLyrics?: string | null;
		syncedLyrics?: string | null;
		instrumental?: boolean;
	};

	return {
		id: json.id,
		plainLyrics: json.plainLyrics ?? null,
		syncedLyrics: json.syncedLyrics ?? null,
		instrumental: json.instrumental ?? false,
	};
}

