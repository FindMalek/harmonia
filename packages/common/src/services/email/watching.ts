export function wasStillWatching({
	triggeredBy,
	completedAt,
	lastClientSeenAt,
	awayThresholdMs,
}: {
	triggeredBy: "user" | "cron" | null;
	completedAt: Date | null;
	lastClientSeenAt: Date | null;
	awayThresholdMs: number;
}): boolean {
	if (triggeredBy === "cron") return false;
	if (lastClientSeenAt === null || completedAt === null) return false;
	return completedAt.getTime() - lastClientSeenAt.getTime() < awayThresholdMs;
}
