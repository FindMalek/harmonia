import { Separator } from "@sonaraem/ui";

export function DashboardPlaylistDetailSectionLabel({
	label,
}: {
	label: string;
}) {
	return (
		<div className="flex flex-col gap-2 pb-2">
			<span className="text-muted-foreground text-xs uppercase tracking-widest">
				{label}
			</span>
			<Separator />
		</div>
	);
}
