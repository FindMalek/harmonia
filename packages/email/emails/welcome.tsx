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

export type WelcomeEmailProps = {
	dashboardUrl: string;
	recipientName?: string | null;
};

const checklist = [
	"Connect Spotify and sync your library",
	"Run organize to classify tracks and build playlists",
	"Review playlists in your dashboard",
];

export function WelcomeEmail({
	dashboardUrl = "http://127.0.0.1:3003",
	recipientName,
}: WelcomeEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";

	return (
		<EmailThemeProvider preview={<Preview>Welcome to Harmonia</Preview>}>
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
						Welcome to Harmonia, {safeName}
					</Heading>
					<Text
						className={`mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Thanks for signing up. Harmonia helps you organize your Spotify
						library with AI — so you spend less time sorting and more time
						listening.
					</Text>

					{checklist.map((item) => (
						<Text
							key={item}
							className={`mb-[8px] text-[14px] leading-[22px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							• {item}
						</Text>
					))}

					<Section className="mt-[40px] mb-[40px] text-center">
						<Button href={dashboardUrl}>Open dashboard</Button>
					</Section>

					<Footer complianceText="You are receiving this email because you created a Harmonia account." />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

WelcomeEmail.PreviewProps = {
	dashboardUrl: "http://127.0.0.1:3003",
	recipientName: "Malek",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
