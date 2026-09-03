import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(repoRoot, ".env") });

const { db } = await import("@sonaraem/db");
const { playlist } = await import("@sonaraem/db/schema/playlist");
const { track } = await import("@sonaraem/db/schema/track");
const { trackAnalysis } = await import("@sonaraem/db/schema/track-analysis");
const { count, countDistinct, eq, isNotNull } = await import("drizzle-orm");

const STATS_PATH = path.join(repoRoot, "STATS.md");
const STATS_COLOR = "18181b";
const STATS_START = "<!-- STATS:START -->";
const STATS_END = "<!-- STATS:END -->";
const STATS_DATA_RE =
	/<!-- STATS:DATA tracksEmbedded=(\d+) tracksTagged=(\d+) playlistsGenerated=(\d+) -->/;

function renderStatsBlock(
	tracksEmbedded: number,
	tracksTagged: number,
	playlistsGenerated: number,
	lastUpdated: string,
): string {
	const badgeUrl =
		`https://shieldcn.dev/group/badge/Tracks_embedded-${tracksEmbedded}-${STATS_COLOR}` +
		`+badge/Tracks_tagged-${tracksTagged}-${STATS_COLOR}` +
		`+badge/Playlists_generated-${playlistsGenerated}-${STATS_COLOR}.svg?variant=secondary&mode=dark`;

	return [
		STATS_START,
		`<!-- STATS:DATA tracksEmbedded=${tracksEmbedded} tracksTagged=${tracksTagged} playlistsGenerated=${playlistsGenerated} -->`,
		`![Library stats](${badgeUrl})`,
		"",
		`_Last updated: ${lastUpdated}_`,
		STATS_END,
	].join("\n");
}

function readExistingCounts(
	content: string,
): {
	tracksEmbedded: number;
	tracksTagged: number;
	playlistsGenerated: number;
} | null {
	const match = content.match(STATS_DATA_RE);
	if (!match) return null;
	const [, embedded, tagged, generated] = match;
	if (!embedded || !tagged || !generated) return null;
	return {
		tracksEmbedded: Number(embedded),
		tracksTagged: Number(tagged),
		playlistsGenerated: Number(generated),
	};
}

const [embeddedRows, taggedRows, generatedRows] = await Promise.all([
	db.select({ total: count() }).from(track).where(isNotNull(track.embedding)),
	db
		.select({ total: countDistinct(trackAnalysis.trackId) })
		.from(trackAnalysis),
	db
		.select({ total: count() })
		.from(playlist)
		.where(eq(playlist.isGenerated, true)),
]);

const tracksEmbedded = embeddedRows[0]?.total ?? 0;
const tracksTagged = taggedRows[0]?.total ?? 0;
const playlistsGenerated = generatedRows[0]?.total ?? 0;

const existing = fs.existsSync(STATS_PATH)
	? fs.readFileSync(STATS_PATH, "utf-8")
	: null;
const existingCounts = existing ? readExistingCounts(existing) : null;

if (
	existingCounts &&
	existingCounts.tracksEmbedded === tracksEmbedded &&
	existingCounts.tracksTagged === tracksTagged &&
	existingCounts.playlistsGenerated === playlistsGenerated
) {
	console.info("library-stats: counts unchanged, leaving STATS.md untouched.");
	process.exit(0);
}

const lastUpdated = new Date().toISOString().slice(0, 10);
const block = renderStatsBlock(
	tracksEmbedded,
	tracksTagged,
	playlistsGenerated,
	lastUpdated,
);

const header = [
	"# Library Stats",
	"",
	"Auto-generated snapshot of pipeline progress, refreshed every 3 days by [`library-stats.yml`](.github/workflows/library-stats.yml). Do not edit the block below by hand — it's overwritten on every run.",
	"",
].join("\n");

const nextContent =
	existing && existing.includes(STATS_START) && existing.includes(STATS_END)
		? existing.replace(
				new RegExp(`${STATS_START}[\\s\\S]*?${STATS_END}`),
				block,
			)
		: `${header}${block}\n`;

fs.writeFileSync(STATS_PATH, nextContent);
console.info(
	`library-stats: wrote STATS.md (embedded=${tracksEmbedded}, tagged=${tracksTagged}, generated=${playlistsGenerated}).`,
);
