import { Section, Text } from "@react-email/components";
import {
	emailTheme,
	HarmoniaEmailShell,
	PrimaryButton,
} from "./_components/layout";

export type LoginAlertEmailProps = {
	recipientName?: string | null;
	loginAtIso: string;
	ipAddress?: string | null;
	userAgent?: string | null;
	settingsUrl: string;
};

export function LoginAlertEmail({
	recipientName,
	loginAtIso = new Date().toISOString(),
	ipAddress,
	userAgent,
	settingsUrl = "http://127.0.0.1:3003/settings/notifications",
}: LoginAlertEmailProps) {
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";
	const loginAt = new Date(loginAtIso).toLocaleString("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	});

	return (
		<HarmoniaEmailShell
			previewText="New Harmonia login"
			title={`New login detected, ${safeName}`}
			subtitle="We noticed a new sign-in on your account. If this was you, no action is needed."
			complianceText="You are receiving this transactional security email to protect your account."
		>
			<Section style={details}>
				<Text style={detailLine}>
					<span style={detailLabel}>Time:</span> {loginAt}
				</Text>
				{ipAddress ? (
					<Text style={detailLine}>
						<span style={detailLabel}>IP address:</span> {ipAddress}
					</Text>
				) : null}
				{userAgent ? (
					<Text style={detailLine}>
						<span style={detailLabel}>Device:</span> {userAgent}
					</Text>
				) : null}
			</Section>
			<Text style={text}>
				Wasn&apos;t you? Review your access and update security settings
				immediately.
			</Text>
			<Section style={{ margin: "0 0 10px" }}>
				<PrimaryButton href={settingsUrl} label="Review account security" />
			</Section>
			<Text style={subtleText}>
				You can also open{" "}
				<a href={settingsUrl} style={inlineLink}>
					settings
				</a>{" "}
				directly.
			</Text>
		</HarmoniaEmailShell>
	);
}

LoginAlertEmail.PreviewProps = {
	recipientName: "Malek",
	loginAtIso: new Date().toISOString(),
	ipAddress: "203.0.113.4",
	userAgent: "Mozilla/5.0",
	settingsUrl: "http://127.0.0.1:3003/settings/notifications",
} satisfies LoginAlertEmailProps;

export default LoginAlertEmail;

const text = {
	color: emailTheme.colors.mutedText,
	fontSize: "15px",
	lineHeight: "1.6",
	margin: "0 0 14px",
};

const details = {
	backgroundColor: emailTheme.colors.softBackground,
	border: `1px solid ${emailTheme.colors.border}`,
	borderRadius: "12px",
	marginBottom: "14px",
	padding: "14px",
};

const detailLine = {
	color: emailTheme.colors.text,
	fontSize: "14px",
	lineHeight: "1.6",
	margin: "0 0 6px",
};

const detailLabel = {
	color: emailTheme.colors.softText,
	fontWeight: "600",
};

const subtleText = {
	color: emailTheme.colors.softText,
	fontSize: "13px",
	lineHeight: "1.6",
	margin: "0",
};

const inlineLink = {
	color: emailTheme.colors.primary,
	textDecoration: "underline",
};
