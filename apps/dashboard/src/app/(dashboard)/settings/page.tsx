"use client";

import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	Badge,
	Button,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@harmonia/ui";
import { formatDistanceToNow } from "date-fns";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
	DashboardSettingsNavRow,
	DashboardSettingsRow,
	DashboardSettingsSection,
	DashboardSettingsSkeleton,
} from "@/components/app/dashboard-settings-section";
import { PageHeader } from "@/components/shared/page-header";
import { useSettingsController } from "@/shared/lib/settings/controller.hook";

export default function SettingsPage() {
	const router = useRouter();
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	const {
		email,
		spotifyLinked,
		spotifyLoading,
		lastSync,
		statsLoading,
		theme,
		resolvedTheme,
		setTheme,
		signOut,
		deleteAccount,
	} = useSettingsController();

	if (!mounted) {
		return <DashboardSettingsSkeleton />;
	}

	const lastSyncText = statsLoading
		? "..."
		: lastSync
			? formatDistanceToNow(lastSync, { addSuffix: true })
			: "Never";

	const resolvedThemeLabel = resolvedTheme === "dark" ? "Dark" : "Light";

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Settings"
				description="Manage your account and app preferences."
			/>

			<DashboardSettingsSection label="CONNECTED SERVICES">
				<DashboardSettingsRow
					label="Spotify"
					value={
						spotifyLoading ? (
							"..."
						) : spotifyLinked ? (
							<span className="flex items-center gap-1.5">
								<span className="size-2 rounded-full bg-green-500" />
								Connected
							</span>
						) : (
							"Not connected"
						)
					}
				/>
				<DashboardSettingsRow label="Last sync" value={lastSyncText} />
			</DashboardSettingsSection>

			<DashboardSettingsSection label="ACCOUNT">
				<DashboardSettingsRow label="Email" value={email ?? "..."} />
				<DashboardSettingsRow label="Plan" value="Free" />
			</DashboardSettingsSection>

			<DashboardSettingsSection label="PREFERENCES">
				<div className="flex items-center justify-between border-b py-4 last:border-b-0">
					<span className="text-muted-foreground text-sm">Theme</span>
					<Select value={theme ?? "system"} onValueChange={setTheme}>
						<SelectTrigger className="h-8 w-44 text-sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="system">
								{`System default (${resolvedThemeLabel})`}
							</SelectItem>
							<SelectItem value="light">Light</SelectItem>
							<SelectItem value="dark">Dark</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<DashboardSettingsRow
					label="Analysis Frequency"
					value={
						<Badge variant="outline" className="text-xs">
							Coming soon
						</Badge>
					}
				/>
				<DashboardSettingsNavRow
					label="Notifications"
					subtitle="Manage email alerts and marketing preferences"
					onClick={() =>
						router.push(
							DASHBOARD_ROUTES.settings.children.notifications.path as Route,
						)
					}
				/>
			</DashboardSettingsSection>

			<Button
				variant="destructive"
				className="w-full"
				onClick={() => void signOut()}
			>
				Sign out
			</Button>

			<DashboardSettingsSection label="DANGER ZONE">
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="destructive" className="w-full">
							Delete account
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete your account?</AlertDialogTitle>
							<AlertDialogDescription>
								This permanently deletes your Harmonia account, your library
								cache, generated playlists, and all AI analysis. This does not
								affect your actual Spotify account or library. This cannot be
								undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								disabled={deleteAccount.isPending}
								onClick={() => deleteAccount.mutate({})}
							>
								{deleteAccount.isPending ? "Deleting..." : "Delete account"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</DashboardSettingsSection>
		</div>
	);
}
