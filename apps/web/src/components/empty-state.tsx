import type { LucideIcon } from "lucide-react";
import { Music2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
	icon?: LucideIcon;
	title: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	variant?: "minimal" | "card";
	className?: string;
};

export function EmptyState({
	icon: Icon = Music2,
	title,
	description,
	action,
	variant = "minimal",
	className,
}: EmptyStateProps) {
	const content = (
		<>
			<Icon className="text-muted-foreground size-10 shrink-0" />
			<div className="flex flex-col gap-1">
				<p className="font-medium text-sm text-foreground">{title}</p>
				{description && (
					<p className="text-muted-foreground text-xs">{description}</p>
				)}
				{action && (
					<Button
						variant="outline"
						size="sm"
						className="mt-2 w-fit"
						onClick={action.onClick}
					>
						{action.label}
					</Button>
				)}
			</div>
		</>
	);

	if (variant === "card") {
		return (
			<div
				className={cn(
					"flex items-start gap-4 rounded-none border p-6",
					className,
				)}
			>
				{content}
			</div>
		);
	}

	return (
		<div
			className={cn("flex items-start gap-3 text-muted-foreground", className)}
		>
			{content}
		</div>
	);
}
