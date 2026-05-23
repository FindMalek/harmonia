export function parseJsonStringArray(
	value: string | null | undefined,
): string[] {
	if (!value) return [];

	try {
		const parsed: unknown = JSON.parse(value);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((item): item is string => typeof item === "string");
	} catch {
		return [];
	}
}
