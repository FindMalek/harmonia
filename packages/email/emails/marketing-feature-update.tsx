import {
	Body,
	Container,
	Heading,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import {
	Button,
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";

export type MarketingFeatureUpdateEmailProps = {
	featureTitle: string;
	featureSummary: string;
	recipientName?: string | null;
	ctaUrl: string;
	preferencesUrl: string;
	unsubscribeUrl: string;
};

export function MarketingFeatureUpdateEmail({
	featureTitle,
	featureSummary,
	recipientName,
	ctaUrl = "http://127.0.0.1:3003/playlists",
	preferencesUrl = "http://127.0.0.1:3003/settings/notifications",
	unsubscribeUrl = "http://127.0.0.1:3003/settings/notifications?unsubscribe=all",
}: MarketingFeatureUpdateEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";

	return (
		<EmailThemeProvider
			preview={<Preview>{`New in Harmonia: ${featureTitle}`}</Preview>}
		>
			<Body
				className={`mx-auto my-auto font-sans ${themeClasses.body}`}
				style={lightStyles.body}
			>
				<Container
					className={`mx-auto my-[40px] max-w-[600px] p-[20px] ${themeClasses.container}`}
					style={{
						borderStyle: "solid",
						borderWidth: 1,
						borderColor: lightStyles.container.borderColor,
					}}
				>
					<Logo />
					<Heading
						className={`mt-[24px] mb-[8px] text-center font-normal font-serif text-[21px] ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						New in Harmonia
					</Heading>
					<Text
						className={`mb-[8px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Hi {safeName},
					</Text>

					<Section
						className={`my-[20px] rounded-md p-[16px] ${themeClasses.highlight}`}
						style={{
							borderStyle: "solid",
							borderWidth: 1,
							borderColor: lightStyles.container.borderColor,
						}}
					>
						<Text
							className={`m-0 mb-[8px] font-semibold text-[16px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							{featureTitle}
						</Text>
						<Text
							className={`m-0 text-[14px] leading-[22px] ${themeClasses.mutedText}`}
							style={{ color: lightStyles.mutedText.color }}
						>
							{featureSummary}
						</Text>
					</Section>

					<Section className="mt-[40px] mb-[40px] text-center">
						<Button href={ctaUrl}>Try it now</Button>
					</Section>

					<Footer
						settingsUrl={preferencesUrl}
						unsubscribeUrl={unsubscribeUrl}
						complianceText="You are receiving this email because you opted in to product updates from Harmonia."
					/>
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

MarketingFeatureUpdateEmail.PreviewProps = {
	featureTitle: "Smarter playlist clustering",
	featureSummary:
		"We improved how tracks are grouped so your auto-generated playlists feel more cohesive.",
	recipientName: "Malek",
	ctaUrl: "http://127.0.0.1:3003/playlists",
	preferencesUrl: "http://127.0.0.1:3003/settings/notifications",
	unsubscribeUrl:
		"http://127.0.0.1:3003/settings/notifications?unsubscribe=all",
} satisfies MarketingFeatureUpdateEmailProps;

export default MarketingFeatureUpdateEmail;
