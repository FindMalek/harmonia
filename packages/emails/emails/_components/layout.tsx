import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import type { ReactNode } from "react";

type FooterLink = {
	label: string;
	href: string;
};

export const emailTheme = {
	colors: {
		background: "#f3f7f4",
		surface: "#ffffff",
		text: "#111827",
		mutedText: "#4b5563",
		softText: "#6b7280",
		border: "#d9e4db",
		softBackground: "#eef6f0",
		primary: "#2f9e44",
		primaryText: "#ffffff",
	},
	fonts: {
		base: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
	},
} as const;

export function HarmoniaEmailShell({
	previewText,
	title,
	subtitle,
	children,
	complianceText,
	footerLinks,
}: {
	previewText: string;
	title: string;
	subtitle?: string;
	children: ReactNode;
	complianceText: string;
	footerLinks?: FooterLink[];
}) {
	return (
		<Html>
			<Head />
			<Preview>{previewText}</Preview>
			<Body style={body}>
				<Container style={container}>
					<Section style={card}>
						<Section style={headerSection}>
							<Text style={logoMark}>H</Text>
							<Text style={brandName}>HARMONIA</Text>
							<Text style={brandTagline}>
								AI music organization, done right.
							</Text>
						</Section>

						<Section style={contentSection}>
							<Heading style={titleStyle}>{title}</Heading>
							{subtitle ? <Text style={subtitleStyle}>{subtitle}</Text> : null}
							{children}
						</Section>

						<Section style={footerSection}>
							<Text style={complianceTextStyle}>{complianceText}</Text>
							{footerLinks?.length ? (
								<Text style={footerLinksStyle}>
									{footerLinks.map((link, index) => (
										<span key={link.href}>
											{index > 0 ? "  ·  " : ""}
											<a href={link.href} style={footerLink}>
												{link.label}
											</a>
										</span>
									))}
								</Text>
							) : null}
						</Section>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

export function PrimaryButton({
	href,
	label,
}: {
	href: string;
	label: string;
}) {
	return (
		<Button href={href} style={primaryButton}>
			{label}
		</Button>
	);
}

export const body = {
	backgroundColor: emailTheme.colors.background,
	color: emailTheme.colors.text,
	fontFamily: emailTheme.fonts.base,
	margin: "0",
	padding: "24px 12px",
};

export const container = {
	margin: "0 auto",
	maxWidth: "600px",
	width: "100%",
};

export const card = {
	backgroundColor: emailTheme.colors.surface,
	border: `1px solid ${emailTheme.colors.border}`,
	borderRadius: "18px",
	overflow: "hidden",
};

const headerSection = {
	backgroundColor: emailTheme.colors.softBackground,
	borderBottom: `1px solid ${emailTheme.colors.border}`,
	padding: "18px 24px",
};

const logoMark = {
	backgroundColor: emailTheme.colors.primary,
	borderRadius: "10px",
	color: emailTheme.colors.primaryText,
	display: "inline-block",
	fontSize: "16px",
	fontWeight: "800",
	lineHeight: "1",
	margin: "0 8px 0 0",
	padding: "10px 12px",
};

const brandName = {
	color: emailTheme.colors.text,
	display: "inline-block",
	fontSize: "13px",
	fontWeight: "800",
	letterSpacing: "0.16em",
	lineHeight: "1",
	margin: "0",
	verticalAlign: "top" as const,
	paddingTop: "10px",
};

const brandTagline = {
	color: emailTheme.colors.softText,
	fontSize: "12px",
	lineHeight: "1.5",
	margin: "10px 0 0",
};

const contentSection = {
	padding: "28px 24px 22px",
};

const titleStyle = {
	color: emailTheme.colors.text,
	fontSize: "28px",
	fontWeight: "800",
	lineHeight: "1.2",
	margin: "0 0 12px",
};

const subtitleStyle = {
	color: emailTheme.colors.mutedText,
	fontSize: "16px",
	lineHeight: "1.65",
	margin: "0 0 18px",
};

const footerSection = {
	borderTop: `1px solid ${emailTheme.colors.border}`,
	padding: "18px 24px 24px",
};

const complianceTextStyle = {
	color: emailTheme.colors.softText,
	fontSize: "12px",
	lineHeight: "1.6",
	margin: "0",
};

const footerLinksStyle = {
	color: emailTheme.colors.softText,
	fontSize: "12px",
	lineHeight: "1.6",
	margin: "10px 0 0",
};

const footerLink = {
	color: emailTheme.colors.primary,
	textDecoration: "underline",
};

const primaryButton = {
	backgroundColor: emailTheme.colors.primary,
	borderRadius: "10px",
	color: emailTheme.colors.primaryText,
	display: "inline-block",
	fontSize: "16px",
	fontWeight: "700",
	lineHeight: "1",
	padding: "14px 20px",
	textDecoration: "none",
};
