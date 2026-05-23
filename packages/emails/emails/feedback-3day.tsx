import { Section, Text } from "@react-email/components";
import {
	emailTheme,
	HarmoniaEmailShell,
	PrimaryButton,
} from "./_components/layout";

export type Feedback3DayEmailProps = {
	recipientName?: string | null;
	feedbackUrl: string;
	dashboardUrl: string;
};

export function Feedback3DayEmail({
	recipientName,
	feedbackUrl = "http://127.0.0.1:3003/settings/notifications",
	dashboardUrl = "http://127.0.0.1:3003",
}: Feedback3DayEmailProps) {
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";

	return (
		<HarmoniaEmailShell
			previewText="How is Harmonia working for you?"
			title={`How is Harmonia going, ${safeName}?`}
			subtitle="Your feedback directly shapes playlist quality, naming, and recommendation accuracy."
			complianceText="You are receiving this transactional product-feedback request related to your active Harmonia usage."
		>
			<Section style={promptCard}>
				<Text style={promptTitle}>2-minute feedback</Text>
				<Text style={promptBody}>
					Tell us what felt great and what needs work. We review this feedback
					daily and prioritize product improvements from real usage signals.
				</Text>
			</Section>

			<Section style={{ margin: "0 0 12px" }}>
				<PrimaryButton href={feedbackUrl} label="Share feedback" />
			</Section>

			<Text style={subtleText}>
				Prefer to keep organizing first? Open{" "}
				<a href={dashboardUrl} style={inlineLink}>
					your dashboard
				</a>
				.
			</Text>
		</HarmoniaEmailShell>
	);
}

Feedback3DayEmail.PreviewProps = {
	recipientName: "Malek",
	feedbackUrl: "https://example.com/feedback",
	dashboardUrl: "http://127.0.0.1:3003",
} satisfies Feedback3DayEmailProps;

export default Feedback3DayEmail;

const promptCard = {
	backgroundColor: emailTheme.colors.softBackground,
	border: `1px solid ${emailTheme.colors.border}`,
	borderRadius: "12px",
	margin: "0 0 14px",
	padding: "14px 16px",
};

const promptTitle = {
	color: emailTheme.colors.text,
	fontSize: "14px",
	fontWeight: "700",
	lineHeight: "1.4",
	margin: "0 0 6px",
};

const promptBody = {
	color: emailTheme.colors.mutedText,
	fontSize: "14px",
	lineHeight: "1.6",
	margin: "0",
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
