export function DashboardPlaylistDetailMetadataRow({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center justify-between border-b py-4 last:border-b-0">
			<span className="text-muted-foreground text-sm">{label}</span>
			<span className="font-medium text-sm">{value}</span>
		</div>
	);
}
