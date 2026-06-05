import {
	Body,
	Column,
	Container,
	Heading,
	Hr,
	Img,
	Link,
	Preview,
	Row,
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

export type InvoiceLineItem = {
	description: string;
	quantity?: number | null;
	unitPrice: string;
	total: string;
};

export type InvoiceEmailProps = {
	recipientName?: string | null;
	recipientEmail: string;
	invoiceNumber: string;
	invoiceDate: string;
	amount: string;
	planName: string;
	billingPeriod: string;
	subtotal?: string | null;
	tax?: string | null;
	paymentMethod?: string | null;
	lineItems?: InvoiceLineItem[] | null;
	downloadUrl?: string | null;
	dashboardUrl: string;
};

export function InvoiceEmail({
	recipientName,
	recipientEmail = "user@example.com",
	invoiceNumber = "INV-0001",
	invoiceDate,
	amount = "$9.00",
	planName = "Pro",
	billingPeriod = "June 2026",
	subtotal,
	tax,
	paymentMethod,
	lineItems,
	downloadUrl,
	dashboardUrl = "http://127.0.0.1:3003",
}: InvoiceEmailProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");
	const safeName =
		typeof recipientName === "string" && recipientName.trim().length > 0
			? recipientName
			: "there";
	const formattedInvoiceDate = invoiceDate
		? format(new Date(invoiceDate), "PPP")
		: null;

	const resolvedLineItems =
		Array.isArray(lineItems) && lineItems.length > 0
			? lineItems
			: [
					{
						description: `Harmonia ${planName}`,
						quantity: 1,
						unitPrice: amount,
						total: amount,
					},
				];

	return (
		<EmailThemeProvider
			preview={<Preview>Your Harmonia receipt — {billingPeriod}</Preview>}
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
						src={getEmailImageUrl("invoice-hero.png")}
						width="560"
						height="200"
						alt=""
						className="mx-auto my-0 block w-full rounded-md object-cover"
						style={{ display: "block" }}
					/>

					{/* Header */}
					<Heading
						className={`mt-[24px] mb-[4px] text-center font-normal font-serif text-[21px] ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						Payment receipt
					</Heading>
					<Text
						className={`mt-0 mb-[24px] text-center text-[14px] leading-[24px] ${themeClasses.mutedText}`}
						style={{ color: lightStyles.mutedText.color }}
					>
						Hi {safeName}, here is your Harmonia receipt for {billingPeriod}.
					</Text>

					{/* Status + Invoice number row */}
					<Section className="mb-[16px]">
						<Row>
							<Column>
								<Text
									className={`m-0 text-[11px] font-semibold uppercase tracking-widest ${themeClasses.mutedText}`}
									style={{ color: lightStyles.mutedText.color }}
								>
									Status
								</Text>
								<Text
									className="m-0 mt-[4px] inline-block rounded px-[8px] py-[3px] text-[11px] font-semibold"
									style={{
										backgroundColor: "#dcfce7",
										color: "#15803d",
									}}
								>
									PAID
								</Text>
							</Column>
							<Column align="right">
								<Text
									className={`m-0 text-[11px] font-semibold uppercase tracking-widest ${themeClasses.mutedText}`}
									style={{ color: lightStyles.mutedText.color }}
								>
									Invoice
								</Text>
								<Text
									className={`m-0 mt-[4px] text-[13px] font-medium ${themeClasses.text}`}
									style={{ color: lightStyles.text.color }}
								>
									{invoiceNumber}
								</Text>
							</Column>
						</Row>
					</Section>

					<Hr
						className={themeClasses.border}
						style={{ borderColor: lightStyles.container.borderColor }}
					/>

					{/* Bill to + Invoice date row */}
					<Section className="my-[16px]">
						<Row>
							<Column>
								<Text
									className={`m-0 text-[11px] font-semibold uppercase tracking-widest ${themeClasses.mutedText}`}
									style={{ color: lightStyles.mutedText.color }}
								>
									Bill to
								</Text>
								{safeName !== "there" ? (
									<Text
										className={`m-0 mt-[4px] text-[13px] font-medium ${themeClasses.text}`}
										style={{ color: lightStyles.text.color }}
									>
										{safeName}
									</Text>
								) : null}
								<Text
									className={`m-0 mt-[2px] text-[13px] ${themeClasses.mutedText}`}
									style={{ color: lightStyles.mutedText.color }}
								>
									{recipientEmail}
								</Text>
							</Column>
							<Column align="right">
								<Text
									className={`m-0 text-[11px] font-semibold uppercase tracking-widest ${themeClasses.mutedText}`}
									style={{ color: lightStyles.mutedText.color }}
								>
									Invoice date
								</Text>
								<Text
									className={`m-0 mt-[4px] text-[13px] ${themeClasses.text}`}
									style={{ color: lightStyles.text.color }}
								>
									{formattedInvoiceDate ?? billingPeriod}
								</Text>
							</Column>
						</Row>
					</Section>

					<Hr
						className={themeClasses.border}
						style={{ borderColor: lightStyles.container.borderColor }}
					/>

					{/* Line items header */}
					<Section className="mt-[16px]">
						<Row>
							<Column style={{ width: "50%" }}>
								<Text
									className={`m-0 text-[11px] font-semibold uppercase tracking-widest ${themeClasses.mutedText}`}
									style={{ color: lightStyles.mutedText.color }}
								>
									Description
								</Text>
							</Column>
							<Column align="center" style={{ width: "20%" }}>
								<Text
									className={`m-0 text-[11px] font-semibold uppercase tracking-widest ${themeClasses.mutedText}`}
									style={{ color: lightStyles.mutedText.color }}
								>
									Qty
								</Text>
							</Column>
							<Column align="right" style={{ width: "15%" }}>
								<Text
									className={`m-0 text-[11px] font-semibold uppercase tracking-widest ${themeClasses.mutedText}`}
									style={{ color: lightStyles.mutedText.color }}
								>
									Unit price
								</Text>
							</Column>
							<Column align="right" style={{ width: "15%" }}>
								<Text
									className={`m-0 text-[11px] font-semibold uppercase tracking-widest ${themeClasses.mutedText}`}
									style={{ color: lightStyles.mutedText.color }}
								>
									Total
								</Text>
							</Column>
						</Row>
					</Section>

					<Hr
						className={themeClasses.border}
						style={{ borderColor: lightStyles.container.borderColor }}
					/>

					{/* Line items */}
					{resolvedLineItems.map((item, index) => (
						<Section key={`${item.description}-${index}`}>
							<Row>
								<Column style={{ width: "50%" }}>
									<Text
										className={`m-0 py-[10px] text-[13px] ${themeClasses.text}`}
										style={{ color: lightStyles.text.color }}
									>
										{item.description}
									</Text>
									<Text
										className={`m-0 text-[12px] ${themeClasses.mutedText}`}
										style={{ color: lightStyles.mutedText.color }}
									>
										{billingPeriod}
									</Text>
								</Column>
								<Column align="center" style={{ width: "20%" }}>
									<Text
										className={`m-0 py-[10px] text-[13px] ${themeClasses.mutedText}`}
										style={{ color: lightStyles.mutedText.color }}
									>
										{item.quantity ?? 1}
									</Text>
								</Column>
								<Column align="right" style={{ width: "15%" }}>
									<Text
										className={`m-0 py-[10px] text-[13px] ${themeClasses.mutedText}`}
										style={{ color: lightStyles.mutedText.color }}
									>
										{item.unitPrice}
									</Text>
								</Column>
								<Column align="right" style={{ width: "15%" }}>
									<Text
										className={`m-0 py-[10px] text-[13px] font-medium ${themeClasses.text}`}
										style={{ color: lightStyles.text.color }}
									>
										{item.total}
									</Text>
								</Column>
							</Row>
							<Hr
								className={themeClasses.border}
								style={{ borderColor: lightStyles.container.borderColor }}
							/>
						</Section>
					))}

					{/* Totals */}
					<Section className="mb-[8px]">
						{subtotal ? (
							<Row>
								<Column>
									<Text
										className={`m-0 py-[4px] text-[13px] ${themeClasses.mutedText}`}
										style={{ color: lightStyles.mutedText.color }}
									>
										Subtotal
									</Text>
								</Column>
								<Column align="right">
									<Text
										className={`m-0 py-[4px] text-[13px] ${themeClasses.mutedText}`}
										style={{ color: lightStyles.mutedText.color }}
									>
										{subtotal}
									</Text>
								</Column>
							</Row>
						) : null}
						{tax ? (
							<Row>
								<Column>
									<Text
										className={`m-0 py-[4px] text-[13px] ${themeClasses.mutedText}`}
										style={{ color: lightStyles.mutedText.color }}
									>
										Tax
									</Text>
								</Column>
								<Column align="right">
									<Text
										className={`m-0 py-[4px] text-[13px] ${themeClasses.mutedText}`}
										style={{ color: lightStyles.mutedText.color }}
									>
										{tax}
									</Text>
								</Column>
							</Row>
						) : null}
						<Row>
							<Column>
								<Text
									className={`m-0 pt-[8px] text-[15px] font-semibold ${themeClasses.text}`}
									style={{ color: lightStyles.text.color }}
								>
									Total
								</Text>
							</Column>
							<Column align="right">
								<Text
									className={`m-0 pt-[8px] text-[15px] font-semibold ${themeClasses.text}`}
									style={{ color: lightStyles.text.color }}
								>
									{amount}
								</Text>
							</Column>
						</Row>
					</Section>

					{/* Payment method */}
					{paymentMethod ? (
						<>
							<Hr
								className={themeClasses.border}
								style={{ borderColor: lightStyles.container.borderColor }}
							/>
							<Section className="my-[12px]">
								<Row>
									<Column>
										<Text
											className={`m-0 text-[11px] font-semibold uppercase tracking-widest ${themeClasses.mutedText}`}
											style={{ color: lightStyles.mutedText.color }}
										>
											Payment method
										</Text>
									</Column>
									<Column align="right">
										<Text
											className={`m-0 text-[13px] ${themeClasses.text}`}
											style={{ color: lightStyles.text.color }}
										>
											{paymentMethod}
										</Text>
									</Column>
								</Row>
							</Section>
						</>
					) : null}

					<Hr
						className={themeClasses.border}
						style={{ borderColor: lightStyles.container.borderColor }}
					/>

					<Section className="mt-[32px] mb-[16px] text-center">
						<Button href={dashboardUrl}>Open dashboard</Button>
					</Section>

					{downloadUrl ? (
						<Text
							className={`text-center text-[12px] ${themeClasses.mutedText}`}
							style={{ color: lightStyles.mutedText.color }}
						>
							<Link
								href={downloadUrl}
								style={{ color: lightStyles.mutedText.color }}
								className={themeClasses.mutedLink}
							>
								Download invoice PDF
							</Link>
						</Text>
					) : null}

					<Footer complianceText="You are receiving this transactional billing email because you have an active or recent Harmonia subscription." />
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

InvoiceEmail.PreviewProps = {
	recipientName: "Malek",
	recipientEmail: "malek@example.com",
	invoiceNumber: "INV-0042",
	invoiceDate: new Date().toISOString(),
	amount: "$9.00",
	planName: "Pro",
	billingPeriod: "June 2026",
	subtotal: "$9.00",
	tax: "$0.00",
	paymentMethod: "Visa ending in 4242",
	lineItems: [
		{
			description: "Harmonia Pro — monthly",
			quantity: 1,
			unitPrice: "$9.00",
			total: "$9.00",
		},
	],
	downloadUrl: null,
	dashboardUrl: "http://127.0.0.1:3003",
} satisfies InvoiceEmailProps;

export default InvoiceEmail;
