import { Icons, Separator } from "@sonaraem/ui";
import type { Route } from "next";
import Link from "next/link";

export function DashboardDetailBackLink({
	href,
	label,
}: {
	href: Route | string;
	label: string;
}) {
	return (
		<div className="flex flex-col gap-2">
			<Link
				href={href as Route}
				className="flex items-center gap-1 text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground"
			>
				<Icons.arrowLeft className="size-3" />
				{label}
			</Link>
			<Separator />
		</div>
	);
}
