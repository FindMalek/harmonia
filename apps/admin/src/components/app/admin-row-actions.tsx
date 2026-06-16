"use client";

import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@harmonia/ui";

type RowAction = {
	label: string;
	onClick: () => void;
	variant?: "default" | "destructive";
};

export function AdminRowActions({ actions }: { actions: RowAction[] }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-7 w-7 p-0">
					<span className="sr-only">Open actions</span>
					<span className="text-base leading-none">⋯</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{actions.map((action) => (
					<DropdownMenuItem
						key={action.label}
						onClick={action.onClick}
						className={
							action.variant === "destructive" ? "text-destructive" : undefined
						}
					>
						{action.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
