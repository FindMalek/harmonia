"use client";

import { Button, Icons } from "@harmonia/ui";
import { useOrganize } from "@/hooks/mutations/use-organize";

type AnalyzeMusicButtonProps = {
	hasSpotifyLinked: boolean;
};

export function AnalyzeMusicButton({
	hasSpotifyLinked,
}: AnalyzeMusicButtonProps) {
	const organizeMutation = useOrganize();
	const isPending = organizeMutation.isPending;

	return (
		<Button
			type="button"
			variant="default"
			className="flex h-auto w-full flex-col items-start justify-between gap-2 rounded-xl p-6 text-left sm:flex-row sm:items-center"
			onClick={() => organizeMutation.mutate({})}
			disabled={!hasSpotifyLinked || isPending}
			isLoading={false}
		>
			<div className="flex flex-1 flex-col gap-0.5">
				<span className="font-semibold text-xl">Analyze My Music</span>
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
