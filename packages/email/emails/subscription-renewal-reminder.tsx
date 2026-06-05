import {
	Body,
	Container,
	Heading,
	Img,
	Link,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { format } from "date-fns";
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import {
	Button,
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";
import { getEmailImageUrl } from "../utils";

export type SubscriptionRenewalReminderEmailProps = {
	recipientName?: string | null;
	planName: string;
	renewalDate: string;
	amount: string;
	manageSubscriptionUrl: string;
	dashboardUrl: string;
};

export function SubscriptionRenewalReminderEmail({
	recipientName,
	planName = "Pro",
	renewalDate,
	amount = "$9/month",
	manageSubscriptionUrl = "http://127.0.0.1:3003/settings/billing",
	dashboardUrl = "http://127.0.0.1:3003",
}: SubscriptionRenewalReminderEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";
	const formattedRenewalDate = renewalDate
		? format(new Date(renewalDate), "PPP")
		: null;

	return (
		<EmailThemeProvider
			preview={<Preview>Your Harmonia {planName} subscription renews soon</Preview>}
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
						src={getEmailImageUrl("renewal-reminder-hero.png")}
						width="560"
						height="280"
						alt=""
						className="mx-auto my-0 block w-full rounded-md object-cover"
						style={{ display: "block" }}
					/>
					<Heading
						className={`mt-[24px] mb-[8px] text-center font-normal font-serif text-[21px] ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						Your subscription renews soon, {safeName}
					</Heading>
					<Text
						className={`mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Just a heads up — your Harmonia {planName} subscription is coming up
						for renewal. No action needed unless you want to make changes.
					</Text>

					<Section
						className={`mb-[20px] rounded-md p-[16px] ${themeClasses.highlight}`}
						style={{
							borderStyle: "solid",
							borderWidth: 1,
							borderColor: lightStyles.container.borderColor,
						}}
					>
						<Text
							className={`m-0 mb-[8px] text-[14px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							<strong>Plan:</strong> {planName}
						</Text>
						<Text
							className={`m-0 mb-[8px] text-[14px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							<strong>Amount:</strong> {amount}
						</Text>
						{formattedRenewalDate ? (
							<Text
								className={`m-0 text-[14px] ${themeClasses.text}`}
								style={{ color: lightStyles.text.color }}
							>
								<strong>Renewal date:</strong> {formattedRenewalDate}
							</Text>
						) : null}
					</Section>

					<Section className="mt-[40px] mb-[16px] text-center">
						<Button href={manageSubscriptionUrl}>Manage subscription</Button>
					</Section>

					<Text
						className={`text-center text-[12px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Or{" "}
						<Link
							href={dashboardUrl}
							style={{ color: lightStyles.mutedText.color }}
							className={themeClasses.mutedLink}
						>
							open your dashboard
						</Link>
					</Text>

					<Footer complianceText="You are receiving this transactional billing email because you have an active or recent Harmonia subscription." />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

SubscriptionRenewalReminderEmail.PreviewProps = {
	recipientName: "Malek",
	planName: "Pro",
	renewalDate: new Date(
		Date.now() + 7 * 24 * 60 * 60 * 1000,
	).toISOString(),
	amount: "$9/month",
	manageSubscriptionUrl: "http://127.0.0.1:3003/settings/billing",
	dashboardUrl: "http://127.0.0.1:3003",
} satisfies SubscriptionRenewalReminderEmailProps;

export default SubscriptionRenewalReminderEmail;
