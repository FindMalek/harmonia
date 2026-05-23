"use client";

import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { Button } from "@harmonia/ui";
import { useRouter } from "next/navigation";
import {
	DashboardSettingsRow,
	DashboardSettingsSection,
} from "@/components/app/dashboard-settings-section";
import { useSettingsController } from "@/shared/lib/settings/controller.hook";

export default function NotificationsSettingsPage() {
	const router = useRouter();
	const { emailPreferences, emailPreferencesLoading, updateEmailPreferences } =
		useSettingsController();

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="font-bold text-3xl tracking-tight">Notifications</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Choose which emails Harmonia sends to your inbox.
				</p>
			</div>

			<DashboardSettingsSection label="EMAIL PREFERENCES">
				<DashboardSettingsRow
					label="Transactional alerts"
					value={
						<PreferenceButton
							loading={emailPreferencesLoading}
							enabled={emailPreferences?.transactionalEnabled ?? true}
							onToggle={() =>
								updateEmailPreferences.mutate({
									transactionalEnabled: !(
										emailPreferences?.transactionalEnabled ?? true
									),
								})
							}
						/>
					}
				/>
				<DashboardSettingsRow
					label="Product updates"
					value={
						<PreferenceButton
							loading={emailPreferencesLoading}
							enabled={emailPreferences?.productUpdatesEnabled ?? false}
							onToggle={() =>
								updateEmailPreferences.mutate({
									productUpdatesEnabled: !(
										emailPreferences?.productUpdatesEnabled ?? false
									),
								})
							}
						/>
					}
				/>
				<DashboardSettingsRow
					label="Feedback requests"
					value={
						<PreferenceButton
							loading={emailPreferencesLoading}
							enabled={emailPreferences?.feedbackEnabled ?? false}
							onToggle={() =>
								updateEmailPreferences.mutate({
									feedbackEnabled: !(
										emailPreferences?.feedbackEnabled ?? false
									),
								})
							}
						/>
					}
				/>
				<DashboardSettingsRow
					label="Marketing emails"
					value={
						<PreferenceButton
							loading={emailPreferencesLoading}
							enabled={emailPreferences?.marketingEnabled ?? false}
							onToggle={() =>
								updateEmailPreferences.mutate({
									marketingEnabled: !(
										emailPreferences?.marketingEnabled ?? false
									),
								})
							}
						/>
					}
				/>
			</DashboardSettingsSection>

			<Button
				variant="outline"
				className="w-full"
				onClick={() => router.push(DASHBOARD_ROUTES.settings.path)}
			>
				Back to settings
			</Button>
		</div>
	);
}

function PreferenceButton({
	enabled,
	loading,
	onToggle,
}: {
	enabled: boolean;
	loading: boolean;
	onToggle: () => void;
}) {
	if (loading) return "...";

	return (
		<Button
			variant={enabled ? "default" : "outline"}
			size="sm"
			onClick={onToggle}
		>
			{enabled ? "Enabled" : "Disabled"}
		</Button>
	);
}
