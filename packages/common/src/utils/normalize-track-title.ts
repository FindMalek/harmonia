// Matches a trailing version-suffix parenthetical/bracket — e.g. "(Deluxe Edition)",
// "(2009 Remaster)", "[Radio Edit]" — so different releases of the same song
// collapse to one canonical title. Deliberately does NOT strip "Live", "Acoustic",
// "feat./ft.", "Instrumental", or arrangement tags — those are genuinely
// different recordings, not just re-releases of the same one.
const VERSION_SUFFIX_RE =
	/[\s\-–]+[([](deluxe( edition| version)?|remastered?(\s+\d{4})?|\d{4}\s+remaster|radio (edit|version)|single (version|edit)|bonus( track)?|extended( mix| version)?|anniversary edition|special edition|expanded edition|explicit|clean|album version|original album version)[)\]]\s*$/i;

export function normalizeTrackTitle(name: string): string {
	return name.replace(VERSION_SUFFIX_RE, "").trim();
}

/**
 * Groups tracks by normalized (title, primary artist) and keeps one canonical
 * version per group — so a library with both "Song" and "Song (Deluxe
 * Edition)" ends up with just one of them (#130). Prefers the shorter name
 * (the plain version over a version-suffixed one); ties broken by the
 * lexicographically smaller Spotify track ID, for a deterministic result.
 */
export function selectCanonicalTracks<
	T extends { id: string; name: string; primaryArtist: string },
>(tracks: T[]): T[] {
	const canonicalByKey = new Map<string, T>();

	for (const t of tracks) {
		const key = `${normalizeTrackTitle(t.name).toLowerCase()}|||${t.primaryArtist.toLowerCase()}`;
		const existing = canonicalByKey.get(key);
		if (!existing) {
			canonicalByKey.set(key, t);
			continue;
		}
		const isBetter =
			t.name.length !== existing.name.length
				? t.name.length < existing.name.length
				: t.id < existing.id;
		if (isBetter) canonicalByKey.set(key, t);
	}

	return [...canonicalByKey.values()];
}
