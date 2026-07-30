"use client";

import { Button, Icons } from "@harmonia/ui";
import { useOrganizeController } from "@/shared/lib/organize/controller.hook";

export function DashboardAnalyzeMusicButton() {
	const { organizeMutation } = useOrganizeController();
	const isPending = organizeMutation.isPending;

	return (
		<Button
			type="button"
			variant="default"
			className="flex h-auto w-full items-center justify-between gap-4 p-6 text-left"
			onClick={() => organizeMutation.mutate({})}
			disabled={isPending}
		>
			<div className="flex flex-1 flex-col gap-0.5">
				<span className="font-medium text-xl">Analyze My Music</span>
				<span className="text-primary-foreground/80 text-sm">
					{isPending ? "Pipeline running..." : "Execute AI analysis pipeline"}
				</span>
			</div>
			{isPending ? (
				<Icons.spinner className="size-6 shrink-0 animate-spin" />
			) : (
				<Icons.chevronRight className="size-6 shrink-0" />
			)}
		</Button>
	);
}
