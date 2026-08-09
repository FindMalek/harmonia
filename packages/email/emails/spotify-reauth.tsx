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

export type SpotifyReauthEmailProps = {
	dashboardUrl: string;
	recipientName?: string | null;
	stage: "14d" | "3d";
};

const STAGE_COPY: Record<
	SpotifyReauthEmailProps["stage"],
	{ preview: string; heading: string; body: string }
> = {
	"14d": {
		preview: "Your Spotify connection expires in about 2 weeks",
		heading: "Your Spotify connection needs a refresh soon",
		body: "Spotify automatically expires account connections after 6 months. Yours is set to expire in about 2 weeks — reconnect now and Harmonia will keep syncing without any interruption.",
	},
	"3d": {
		preview: "Your Spotify connection expires in a few days",
		heading: "Your Spotify connection expires in a few days",
		body: "This is a second reminder — your Spotify connection to Harmonia expires in about 3 days. Reconnect now to avoid a gap in your syncs and organize runs.",
	},
};

export function SpotifyReauthEmail({
	dashboardUrl = "http://127.0.0.1:3003",
	recipientName,
	stage = "14d",
}: SpotifyReauthEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";
	const copy = STAGE_COPY[stage];

	return (
		<EmailThemeProvider preview={<Preview>{copy.preview}</Preview>}>
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
						{safeName}, {copy.heading}
					</Heading>
					<Text
						className={`mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						{copy.body}
					</Text>

					<Section className="mt-[40px] mb-[40px] text-center">
						<Button href={dashboardUrl}>Reconnect Spotify</Button>
					</Section>

					<Footer complianceText="You are receiving this email because your Harmonia account's Spotify connection needs attention." />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

SpotifyReauthEmail.PreviewProps = {
	dashboardUrl: "http://127.0.0.1:3003",
	recipientName: "Malek",
	stage: "14d",
} satisfies SpotifyReauthEmailProps;

export default SpotifyReauthEmail;
