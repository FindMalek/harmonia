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

export type WaitlistApprovedEmailProps = {
	loginUrl: string;
};

export function WaitlistApprovedEmail({
	loginUrl = "http://127.0.0.1:3003/login",
}: WaitlistApprovedEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");

	return (
		<EmailThemeProvider
			preview={<Preview>You're in — welcome to Harmonia</Preview>}
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
						You're in
					</Heading>
					<Text
						className={`mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Your spot on Harmonia is ready. Sign in with Spotify to connect your
						library and let Harmonia start organizing it for you.
					</Text>
					<Text
						className={`mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.text}`}
						style={{ color: lightStyles.text.color }}
					>
						Your <strong>first 3 months are free</strong> — no card required to
						get started.
					</Text>

					<Section className="mt-[40px] mb-[40px] text-center">
						<Button href={loginUrl}>Sign in with Spotify</Button>
					</Section>

					<Footer complianceText="You are receiving this email because you were approved from the Harmonia waitlist." />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

WaitlistApprovedEmail.PreviewProps = {
	loginUrl: "http://127.0.0.1:3003/login",
} satisfies WaitlistApprovedEmailProps;

export default WaitlistApprovedEmail;
