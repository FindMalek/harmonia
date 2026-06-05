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

export type PaymentFailedEmailProps = {
	recipientName?: string | null;
	amount: string;
	attemptDate: string;
	retryDate?: string | null;
	updatePaymentUrl: string;
	dashboardUrl: string;
};

export function PaymentFailedEmail({
	recipientName,
	amount = "$9.00",
	attemptDate,
	retryDate,
	updatePaymentUrl = "http://127.0.0.1:3003/settings/billing",
	dashboardUrl = "http://127.0.0.1:3003",
}: PaymentFailedEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";
	const formattedAttemptDate = attemptDate
		? format(new Date(attemptDate), "PPP")
		: null;
	const formattedRetryDate =
		retryDate && retryDate.trim().length > 0
			? format(new Date(retryDate), "PPP")
			: null;

	return (
		<EmailThemeProvider
			preview={<Preview>Action required: payment failed</Preview>}
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
						src={getEmailImageUrl("payment-failed-hero.png")}
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
						Your payment didn&apos;t go through
					</Heading>
					<Text
						className={`mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Hi {safeName}, we were unable to process your payment. Please update
						your payment method to keep your subscription active.
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
							className={`m-0 mb-[8px] text-[13px] ${themeClasses.text}`}
							style={{ color: lightStyles.text.color }}
						>
							<strong>Amount:</strong> {amount}
						</Text>
						{formattedAttemptDate ? (
							<Text
								className={`m-0 mb-[8px] text-[13px] ${themeClasses.text}`}
								style={{ color: lightStyles.text.color }}
							>
								<strong>Attempted on:</strong> {formattedAttemptDate}
							</Text>
						) : null}
						{formattedRetryDate ? (
							<Text
								className={`m-0 text-[13px] ${themeClasses.mutedText}`}
								style={{ color: lightStyles.mutedText.color }}
							>
								<strong>Next retry:</strong> {formattedRetryDate}
							</Text>
						) : null}
					</Section>

					<Section className="mt-[40px] mb-[16px] text-center">
						<Button href={updatePaymentUrl}>Update payment method</Button>
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

PaymentFailedEmail.PreviewProps = {
	recipientName: "Malek",
	amount: "$9.00",
	attemptDate: new Date().toISOString(),
	retryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
	updatePaymentUrl: "http://127.0.0.1:3003/settings/billing",
	dashboardUrl: "http://127.0.0.1:3003",
} satisfies PaymentFailedEmailProps;

export default PaymentFailedEmail;
