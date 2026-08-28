/** Strips pnpm/npm `--` separator; accepts `tsx generate.ts hello` and `tsx generate.ts -- hello`. */
export function parseMigrationName(argv: string[]): string | undefined {
	const args = argv.slice(2);
	const sep = args.indexOf("--");
	const raw = sep >= 0 ? args[sep + 1] : args[0];
	return raw?.trim() || undefined;
}

export function toKebabCase(name: string): string {
	return name
		.trim()
		.replace(/[_\s]+/g, "-")
		.replace(/[^a-zA-Z0-9-]/g, "")
		.toLowerCase()
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

/** Requires at least one alphanumeric segment — rejects `--`, empty, or hyphen-only names. */
export function assertValidMigrationSlug(kebab: string): void {
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(kebab)) {
		throw new Error(
			`invalid migration name "${kebab}" — use letters/numbers and hyphens (e.g. backfill-cost-usd)`,
		);
	}
}
