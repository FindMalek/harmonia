import { Section, Text } from "@react-email/components";
import {
	emailTheme,
	HarmoniaEmailShell,
	PrimaryButton,
} from "./_components/layout";

export type WelcomeEmailProps = {
	dashboardUrl: string;
	recipientName?: string | null;
};

export function WelcomeEmail({
	dashboardUrl = "http://127.0.0.1:3003",
	recipientName,
}: WelcomeEmailProps) {
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";

	return (
		<HarmoniaEmailShell
			previewText="Welcome to Harmonia"
			title={`Welcome to Harmonia, ${safeName}`}
			subtitle="Your account is ready. In just a few clicks, Harmonia will organize your Spotify library into focused, high-signal playlists."
			complianceText="You are receiving this transactional email because a Harmonia account was created with this address."
		>
			<Section style={checklistSection}>
				<Text style={checklistTitle}>What to do next</Text>
				<Text style={checklistItem}>1. Connect Spotify in onboarding.</Text>
				<Text style={checklistItem}>2. Run your first organize flow.</Text>
				<Text style={checklistItem}>
					3. Open playlists and start listening.
				</Text>
			</Section>
			<PrimaryButton href={dashboardUrl} label="Open dashboard" />
		</HarmoniaEmailShell>
	);
}

WelcomeEmail.PreviewProps = {
	dashboardUrl: "http://127.0.0.1:3003",
	recipientName: "Malek",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;

const checklistSection = {
	backgroundColor: emailTheme.colors.softBackground,
	border: `1px solid ${emailTheme.colors.border}`,
	borderRadius: "12px",
	margin: "0 0 16px",
	padding: "14px 16px 10px",
};

const checklistTitle = {
	color: emailTheme.colors.text,
	fontSize: "14px",
	fontWeight: "700",
	lineHeight: "1.4",
	margin: "0 0 6px",
};

const checklistItem = {
	color: emailTheme.colors.mutedText,
	fontSize: "14px",
	lineHeight: "1.6",
	margin: "0 0 4px",
};
