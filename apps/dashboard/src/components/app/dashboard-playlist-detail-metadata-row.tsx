function formatMetadataDisplayValue(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) {
		return value;
	}
	if (/^\d+$/.test(trimmed)) {
		return trimmed;
	}
	return trimmed
		.split(",")
		.map((part) => {
			const p = part.trim();
			if (!p) {
				return p;
			}
			return p.charAt(0).toUpperCase() + p.slice(1);
		})
		.join(", ");
}

export function DashboardPlaylistDetailMetadataRow({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	const displayValue = formatMetadataDisplayValue(value);

	return (
		<div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-1 border-b py-4 last:border-b-0">
			<span className="pt-0.5 text-muted-foreground text-sm">{label}</span>
			<span className="break-words text-right font-medium text-sm leading-relaxed">
				{displayValue}
			</span>
		</div>
	);
}
