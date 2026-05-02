import { Icons, Separator } from "@harmonia/ui";
import Link from "next/link";

export function DashboardPlaylistDetailBackLink() {
	return (
		<div className="flex flex-col gap-2">
			<Link
				href="/playlists"
				className="flex items-center gap-1 text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground"
			>
				<Icons.arrowLeft className="size-3" />
				Playlists
			</Link>
			<Separator />
		</div>
	);
}
