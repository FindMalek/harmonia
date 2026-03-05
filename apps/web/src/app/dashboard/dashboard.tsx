"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

import { Button } from "@/components/ui/button";

export default function Dashboard({
	session,
	spotifyEnabled = false,
}: {
	session: typeof authClient.$Infer.Session;
	spotifyEnabled?: boolean;
}) {
	const privateData = useQuery(orpc.privateData.queryOptions());
	const { data: spotifyData } = useQuery(orpc.hasSpotifyLinked.queryOptions());

	const organizeMutation = useMutation(
		orpc.organize.run.mutationOptions({
			onSuccess: (data) => {
				toast.success(
					`Organize pipeline started for user ${data.userId ?? session.user.id}`,
				);
			},
			onError: (error) => {
				toast.error(error.message ?? "Failed to start organize pipeline");
			},
		}),
	);

	const showLinkSpotify = spotifyEnabled && spotifyData?.hasSpotify === false;

	return (
		<div className="space-y-4">
			<p>API: {privateData.data?.message}</p>
			{showLinkSpotify && (
				<Button
					type="button"
					variant="outline"
					onClick={() => {
						authClient.signIn.social({
							provider: "spotify",
							callbackURL: "/dashboard",
						});
					}}
				>
					Link Spotify
				</Button>
			)}
			<button
				type="button"
				onClick={() => organizeMutation.mutate({ userId: undefined })}
				disabled={organizeMutation.isPending}
				className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{organizeMutation.isPending
					? "Running organize pipeline..."
					: "Run organize pipeline"}
			</button>
		</div>
	);
}
