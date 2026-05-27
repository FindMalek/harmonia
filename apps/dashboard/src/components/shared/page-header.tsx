import type * as React from "react";

type Props = {
	title: string;
	description: string;
	actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: Props) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0 flex-1 space-y-1">
				<h1 className="text-2xl text-foreground tracking-tight">{title}</h1>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
			{actions}
		</div>
	);
}
