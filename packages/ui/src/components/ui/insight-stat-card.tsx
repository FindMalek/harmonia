import type * as React from "react";
import { cn } from "../../lib/utils";

function InsightStatCard({
	label,
	value,
	index,
	className,
	...props
}: React.ComponentProps<"div"> & {
	label: string;
	value: string | number;
	index?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col gap-2 border border-border bg-background p-4",
				className,
			)}
			{...props}
		>
			<div className="flex items-center justify-between">
				<span className="text-[9px] text-muted-foreground uppercase tracking-widest">
					{label}
				</span>
				{index && (
					<span className="text-[9px] text-muted-foreground/60">{index}</span>
				)}
			</div>
			<span className="text-[22px] text-foreground leading-none">
				{typeof value === "number" ? value.toLocaleString() : value}
			</span>
		</div>
	);
}

function InsightSectionCard({
	title,
	children,
	className,
	...props
}: React.ComponentProps<"div"> & {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"flex flex-col gap-5 border border-border bg-background p-5",
				className,
			)}
			{...props}
		>
			<div className="border-border border-b pb-3">
				<span className="text-[11px] text-muted-foreground uppercase tracking-widest">
					{title}
				</span>
			</div>
			{children}
		</div>
	);
}

export { InsightSectionCard, InsightStatCard };
