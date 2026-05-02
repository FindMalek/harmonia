"use client";

import { useExportAllPlaylists } from "@/hooks/mutations/use-export-all-playlists";
import { useOrganize } from "@/hooks/mutations/use-organize";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Icons,
} from "@harmonia/ui";

export function DashboardPlaylistsPageHeader({
	hasPlaylists,
}: {
	hasPlaylists: boolean;
}) {
	const organizeMutation = useOrganize();
	const exportMutation = useExportAllPlaylists();
	const isBusy = exportMutation.isPending || organizeMutation.isPending;

	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0 flex-1 space-y-1">
				<h1 className="font-bold text-2xl text-foreground tracking-tight">
					AI Playlists
				</h1>
				<p className="text-muted-foreground text-sm">
					Generated from your taste.
				</p>
			</div>
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
