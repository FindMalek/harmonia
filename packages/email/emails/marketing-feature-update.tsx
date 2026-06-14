import {
	Body,
	Container,
	Heading,
	Hr,
	Img,
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
import { getEmailImageUrl } from "../utils";

export type FeatureHighlight = {
	title: string;
	description: string;
};

export type MarketingFeatureUpdateEmailProps = {
	featureTitle: string;
	featureSummary: string;
	highlights?: FeatureHighlight[] | null;
	badgeText?: string | null;
	recipientName?: string | null;
	ctaUrl: string;
	preferencesUrl: string;
	unsubscribeUrl: string;
};

export function MarketingFeatureUpdateEmail({
	featureTitle,
	featureSummary,
	highlights,
	badgeText,
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
	const resolvedHighlights = Array.isArray(highlights) ? highlights : [];

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
					<Img
						src={getEmailImageUrl("feature-update-hero.png")}
						width="560"
						height="280"
						alt=""
						className="mx-auto my-0 block w-full rounded-md object-cover"
						style={{ display: "block" }}
					/>

					{/* Badge */}
					{badgeText ? (
						<Text
							className="mt-[24px] mb-[8px] text-center font-semibold text-[11px] uppercase tracking-widest"
							style={{ color: lightStyles.button.color }}
						>
							{badgeText}
						</Text>
					) : (
						<Text
							className="mt-[24px] mb-[8px] text-center font-semibold text-[11px] uppercase tracking-widest"
							style={{ color: lightStyles.button.color }}
						>
							Just shipped
						</Text>
					)}

					<Heading
						className={`mt-0 mb-[8px] text-center font-normal font-serif text-[24px] ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						{featureTitle}
					</Heading>

					<Text
						className={`mb-[8px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Hi {safeName},
					</Text>
					<Text
						className={`mt-0 mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						{featureSummary}
					</Text>

					{/* Feature screenshot / visual */}
					<Section
						className={`mb-[24px] rounded-md p-[16px] ${themeClasses.highlight}`}
						style={{
							borderStyle: "solid",
							borderWidth: 1,
							borderColor: lightStyles.container.borderColor,
						}}
					>
						<Img
							src={getEmailImageUrl("feature-update-screenshot.png")}
							width="528"
							height="264"
							alt={featureTitle}
							className="mx-auto my-0 block w-full rounded object-cover"
							style={{ display: "block" }}
						/>
					</Section>

					{/* Highlights */}
					{resolvedHighlights.length > 0 ? (
						<>
							<Hr
								className={themeClasses.border}
								style={{ borderColor: lightStyles.container.borderColor }}
							/>
							<Section className="my-[20px]">
								<Text
									className={`mb-[12px] font-semibold text-[12px] uppercase tracking-widest ${themeClasses.mutedText}`}
									style={{ color: lightStyles.mutedText.color }}
								>
									What&apos;s new
								</Text>
								{resolvedHighlights.map((highlight, index) => (
									<Section key={`highlight-${index}`} className="mb-[12px]">
										<Text
											className={`m-0 font-semibold text-[14px] ${themeClasses.text}`}
											style={{ color: lightStyles.text.color }}
										>
											✦ {highlight.title}
										</Text>
										<Text
											className={`m-0 mt-[4px] pl-[16px] text-[13px] leading-[20px] ${themeClasses.mutedText}`}
											style={{ color: lightStyles.mutedText.color }}
										>
											{highlight.description}
										</Text>
									</Section>
								))}
							</Section>
							<Hr
								className={themeClasses.border}
								style={{ borderColor: lightStyles.container.borderColor }}
							/>
						</>
					) : null}

					<Section className="mt-[32px] mb-[40px] text-center">
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
		"We improved how tracks are grouped so your auto-generated playlists feel more cohesive — tighter moods, better flow, fewer surprises.",
	badgeText: "Just shipped",
	highlights: [
		{
			title: "Tighter mood clusters",
			description:
				"Tracks are now grouped by audio features and lyrical tone together, so playlists stay sonically consistent from start to finish.",
		},
		{
			title: "Smarter fallback logic",
			description:
				"Tracks that didn't fit any cluster before are now intelligently placed into the closest match rather than left out.",
		},
		{
			title: "Up to 40% more playlists generated",
			description:
				"The updated algorithm finds more distinct moods in large libraries, giving you more variety without sacrificing quality.",
		},
	],
	recipientName: "Malek",
	ctaUrl: "http://127.0.0.1:3003/playlists",
	preferencesUrl: "http://127.0.0.1:3003/settings/notifications",
	unsubscribeUrl:
		"http://127.0.0.1:3003/settings/notifications?unsubscribe=all",
} satisfies MarketingFeatureUpdateEmailProps;

export default MarketingFeatureUpdateEmail;
