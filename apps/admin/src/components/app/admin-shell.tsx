import { Separator } from "@sonaraem/ui";

export function AdminShell({
	title,
	description,
	actions,
	children,
}: {
	title: string;
	description?: string;
	actions?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-0.5">
					<h1 className="font-semibold text-xl tracking-tight">{title}</h1>
					{description && (
						<p className="text-muted-foreground text-xs">{description}</p>
					)}
				</div>
				{actions && <div className="shrink-0">{actions}</div>}
			</div>
			<Separator />
			{children}
		</div>
	);
}
