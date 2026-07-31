"use client";

import {
	Button,
	cn,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Icons,
	Input,
} from "@harmonia/ui";
import { useOrganizeController } from "@/shared/lib/organize/controller.hook";
import { usePlaylistsController } from "@/shared/lib/playlists/controller.hook";
import { PageHeader } from "../shared/page-header";

export function DashboardPlaylistsPageHeader({
	hasPlaylists,
	scrolled,
}: {
	hasPlaylists: boolean;
	scrolled: boolean;
}) {
	const { organizeMutation } = useOrganizeController();
	const {
		exportAllMutation: exportMutation,
		search,
		setSearch,
	} = usePlaylistsController();
	const isBusy = exportMutation.isPending || organizeMutation.isPending;

	const actions = hasPlaylists ? (
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
	) : null;

	return (
		<div className="sticky top-0 z-10 -mx-4 -mt-4 bg-background px-4 pt-4 pb-3">
			{/* ponytail: discrete collapse on a scrolled threshold, not a continuous
			scroll-linked interpolation — add spring/transform interpolation if the
			step transition ever feels abrupt. */}
			<div
				className={cn(
					"flex items-start justify-between gap-4 overflow-hidden transition-all duration-200 ease-out",
					scrolled ? "mb-0 max-h-0 opacity-0" : "mb-3 max-h-20 opacity-100",
				)}
			>
				<PageHeader
					title="AI Playlists"
					description="Generated from your taste."
				/>
				{actions}
			</div>

			<div className="flex items-center gap-2">
				{scrolled ? (
					<span className="shrink-0 font-medium text-foreground text-sm">
						AI Playlists
					</span>
				) : null}
				<div className="relative flex-1">
					<Icons.search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search playlists"
						aria-label="Search playlists"
						className="pl-9"
					/>
				</div>
				{scrolled ? actions : null}
			</div>
		</div>
	);
}
