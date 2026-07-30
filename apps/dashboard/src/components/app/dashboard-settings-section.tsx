import { Icons, Separator } from "@harmonia/ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

export function DashboardSettingsSection({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="border">
			<div className="flex flex-col gap-2 px-4 pt-4 pb-2">
				<span className="text-muted-foreground text-xs uppercase tracking-widest">
					{label}
				</span>
				<Separator />
			</div>
			<div className="px-4 pb-4">{children}</div>
		</div>
	);
}

export function DashboardSettingsRow({
	label,
	value,
	valueClassName,
}: {
	label: string;
	value: React.ReactNode;
	valueClassName?: string;
}) {
	return (
		<div className="flex items-center justify-between border-b py-4 last:border-b-0">
			<span className="text-muted-foreground text-sm">{label}</span>
			<span className={cn("font-medium text-sm", valueClassName)}>{value}</span>
		</div>
	);
}

export function DashboardSettingsNavRow({
	label,
	subtitle,
	onClick,
}: {
	label: string;
	subtitle?: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex w-full items-center justify-between border-b py-4 transition-colors last:border-b-0 hover:bg-muted/40"
		>
			<div className="text-left">
				<p className="font-medium text-sm">{label}</p>
				{subtitle && (
					<p className="text-muted-foreground text-xs">{subtitle}</p>
				)}
			</div>
			<Icons.chevronRight className="size-4 shrink-0 text-muted-foreground" />
		</button>
	);
}

export function DashboardSettingsSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<div className="h-8 w-32 animate-pulse rounded bg-muted" />
				<div className="h-4 w-64 animate-pulse rounded bg-muted" />
			</div>
			{[1, 2, 3].map((i) => (
				<div key={i} className="border">
					<div className="px-4 pt-4 pb-2">
						<div className="h-3 w-32 animate-pulse rounded bg-muted" />
					</div>
					<div className="px-4 pb-4">
						{[1, 2].map((j) => (
							<div
								key={j}
								className="flex items-center justify-between border-b py-4 last:border-b-0"
							>
								<div className="h-4 w-24 animate-pulse rounded bg-muted" />
								<div className="h-4 w-28 animate-pulse rounded bg-muted" />
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
