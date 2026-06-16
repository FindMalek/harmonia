"use client";

import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Icons,
} from "@harmonia/ui";

type RowAction = {
	label: string;
	onClick: () => void;
	variant?: "default" | "destructive";
};

export function AdminRowActions({ actions }: { actions: RowAction[] }) {
	const defaultActions = actions.filter((a) => a.variant !== "destructive");
	const destructiveActions = actions.filter((a) => a.variant === "destructive");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon-sm">
					<Icons.dots />
					<span className="sr-only">Open actions</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{defaultActions.map((action) => (
					<DropdownMenuItem key={action.label} onClick={action.onClick}>
						{action.label}
					</DropdownMenuItem>
				))}
				{destructiveActions.length > 0 && defaultActions.length > 0 && (
					<DropdownMenuSeparator />
				)}
				{destructiveActions.map((action) => (
					<DropdownMenuItem
						key={action.label}
						onClick={action.onClick}
						variant="destructive"
					>
						{action.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
