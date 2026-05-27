"use client";

import { useOrganizeController } from "@/shared/lib/organize/controller.hook";
import { usePlaylistsController } from "@/shared/lib/playlists/controller.hook";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Icons,
} from "@harmonia/ui";
import { PageHeader } from "../shared/page-header";

export function DashboardPlaylistsPageHeader({
	hasPlaylists,
}: {
	hasPlaylists: boolean;
}) {
	const { organizeMutation } = useOrganizeController();
	const { exportAllMutation: exportMutation } = usePlaylistsController();
	const isBusy = exportMutation.isPending || organizeMutation.isPending;

	return (
		<div className="flex items-start justify-between gap-4">
			<PageHeader
				title="AI Playlists"
				description="Generated from your taste."
			/>
			{hasPlaylists ? (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="default"
							className="size-11 shrink-0 rounded-none"
							disabled={isBusy}
							aria-label="Playlist actions"
						>
							{isBusy ? (
								<Icons.spinner className="size-5 shrink-0 animate-spin" />
							) : (
								<Icons.plus className="size-5 shrink-0" />
							)}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-48">
						<DropdownMenuItem
							disabled={exportMutation.isPending}
							onSelect={() => {
								exportMutation.mutate({});
							}}
						>
							Send all to Spotify
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={organizeMutation.isPending}
							onSelect={() => {
								organizeMutation.mutate({});
							}}
						>
							Run analysis again
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			) : null}
		</div>
	);
}
