"use client";

import { DASHBOARD_ROUTES } from "@harmonia/common/utils/routes";
import { Switch } from "@harmonia/ui";
import {
	DashboardSettingsRow,
	DashboardSettingsSection,
} from "@/components/app/dashboard-settings-section";
import { DashboardDetailBackLink } from "@/components/shared/dashboard-detail-back-link";
import { useSettingsController } from "@/shared/lib/settings/controller.hook";

export default function NotificationsSettingsPage() {
	const { emailPreferences, emailPreferencesLoading, updateEmailPreferences } =
		useSettingsController();

	const switchDisabled =
		emailPreferencesLoading || updateEmailPreferences.isPending;

	return (
		<div className="flex flex-col gap-6">
			<DashboardDetailBackLink
				href={DASHBOARD_ROUTES.settings.path}
				label="Settings"
			/>

			<div>
				<h1 className="font-bold text-2xl tracking-tight">Notifications</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Choose which emails Harmonia sends to your inbox.
				</p>
			</div>

			<DashboardSettingsSection label="EMAIL PREFERENCES">
				<DashboardSettingsRow
					label="Organize & account emails"
					value={
						<PreferenceSwitch
							loading={emailPreferencesLoading}
							disabled={switchDisabled}
							checked={emailPreferences?.transactionalEnabled ?? true}
							onCheckedChange={(checked) =>
								updateEmailPreferences.mutate({
									transactionalEnabled: checked,
								})
							}
						/>
					}
				/>
				<DashboardSettingsRow
					label="Product feature updates"
					value={
						<PreferenceSwitch
							loading={emailPreferencesLoading}
							disabled={switchDisabled}
							checked={emailPreferences?.productUpdatesEnabled ?? true}
							onCheckedChange={(checked) =>
								updateEmailPreferences.mutate({
									productUpdatesEnabled: checked,
								})
							}
						/>
					}
				/>
				<DashboardSettingsRow
					label="Feedback requests"
					value={
						<PreferenceSwitch
							loading={emailPreferencesLoading}
							disabled={switchDisabled}
							checked={emailPreferences?.feedbackEnabled ?? true}
							onCheckedChange={(checked) =>
								updateEmailPreferences.mutate({
									feedbackEnabled: checked,
								})
							}
						/>
					}
				/>
				<DashboardSettingsRow
					label="Marketing & promotions"
					value={
						<PreferenceSwitch
							loading={emailPreferencesLoading}
							disabled={switchDisabled}
							checked={emailPreferences?.marketingEnabled ?? true}
							onCheckedChange={(checked) =>
								updateEmailPreferences.mutate({
									marketingEnabled: checked,
								})
							}
						/>
					}
				/>
			</DashboardSettingsSection>
		</div>
	);
}

function PreferenceSwitch({
	checked,
	loading,
	disabled,
	onCheckedChange,
}: {
	checked: boolean;
	loading: boolean;
	disabled: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	if (loading) {
		return <span className="text-muted-foreground text-sm">...</span>;
	}

	return (
		<Switch
			checked={checked}
			disabled={disabled}
			onCheckedChange={onCheckedChange}
		/>
	);
}
