import { Section, Text } from "@react-email/components";
import {
	emailTheme,
	HarmoniaEmailShell,
	PrimaryButton,
} from "./_components/layout";

export type MarketingFeatureUpdateEmailProps = {
	featureTitle: string;
	featureSummary: string;
	ctaUrl: string;
	preferencesUrl: string;
	unsubscribeUrl: string;
	recipientName?: string | null;
};

export function MarketingFeatureUpdateEmail({
	featureTitle = "New feature",
	featureSummary = "Explore the latest improvements in Harmonia.",
	ctaUrl = "http://127.0.0.1:3003/playlists",
	preferencesUrl = "http://127.0.0.1:3003/settings/notifications",
	unsubscribeUrl = "http://127.0.0.1:3003/settings/notifications?unsubscribe=all",
	recipientName,
}: MarketingFeatureUpdateEmailProps) {
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";

	return (
		<HarmoniaEmailShell
			previewText={`New in Harmonia: ${featureTitle}`}
			title={`New in Harmonia, ${safeName}`}
			subtitle="We shipped an improvement designed to make your listening workflow faster and more consistent."
			complianceText="You are receiving this marketing email because you opted in to product updates."
			footerLinks={[
				{ label: "Manage preferences", href: preferencesUrl },
				{ label: "Unsubscribe", href: unsubscribeUrl },
			]}
		>
			<Section style={featureCard}>
				<Text style={featureEyebrow}>FEATURE UPDATE</Text>
				<Text style={featureTitleText}>{featureTitle}</Text>
				<Text style={featureSummaryText}>{featureSummary}</Text>
			</Section>

			<Section style={{ margin: "0 0 12px" }}>
				<PrimaryButton href={ctaUrl} label="Try it now" />
			</Section>

			<Text style={secondaryCopy}>
				Want full control over what lands in your inbox? Update your{" "}
				<a href={preferencesUrl} style={inlineLink}>
					email preferences
				</a>
				.
			</Text>
		</HarmoniaEmailShell>
	);
}

MarketingFeatureUpdateEmail.PreviewProps = {
	featureTitle: "Smarter cluster titles",
	featureSummary:
		"Harmonia now creates clearer playlist names using your listening patterns.",
	ctaUrl: "http://127.0.0.1:3003/playlists",
	preferencesUrl: "http://127.0.0.1:3003/settings/notifications",
	unsubscribeUrl: "http://127.0.0.1:3002/api/unsubscribe/example",
	recipientName: "Malek",
} satisfies MarketingFeatureUpdateEmailProps;

export default MarketingFeatureUpdateEmail;
const featureCard = {
	backgroundColor: emailTheme.colors.softBackground,
	border: `1px solid ${emailTheme.colors.border}`,
	borderRadius: "12px",
	margin: "0 0 16px",
	padding: "14px 16px",
};

const featureEyebrow = {
	color: emailTheme.colors.primary,
	fontSize: "11px",
	fontWeight: "700",
	letterSpacing: "0.08em",
	lineHeight: "1.5",
	margin: "0 0 4px",
	textTransform: "uppercase" as const,
};

const featureTitleText = {
	color: emailTheme.colors.text,
	fontSize: "18px",
	fontWeight: "700",
	lineHeight: "1.4",
	margin: "0 0 6px",
};

const featureSummaryText = {
	color: emailTheme.colors.mutedText,
	fontSize: "14px",
	lineHeight: "1.6",
	margin: "0",
};

const secondaryCopy = {
	color: emailTheme.colors.softText,
	fontSize: "13px",
	lineHeight: "1.6",
	margin: "0",
};

const inlineLink = {
	color: emailTheme.colors.primary,
	textDecoration: "underline",
};
