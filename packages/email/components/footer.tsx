import { Hr, Link, Section, Text } from "@react-email/components";
import { getEmailInlineStyles, getEmailThemeClasses } from "./theme";

type FooterProps = {
	tagline?: string;
	settingsUrl?: string;
	unsubscribeUrl?: string;
	complianceText?: string;
};

export function Footer({
	tagline = "Your music, organized.",
	settingsUrl,
	unsubscribeUrl,
	complianceText,
}: FooterProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");

	return (
		<Section className="mt-[32px] w-full">
			<Hr
				className={themeClasses.border}
				style={{ borderColor: lightStyles.container.borderColor }}
			/>

			<Text
				className={`mt-[32px] mb-[24px] text-center font-normal font-serif text-[18px] ${themeClasses.text}`}
				style={{ color: lightStyles.text.color }}
			>
				{tagline}
			</Text>

			{(settingsUrl || unsubscribeUrl) && (
				<Text
					className={`text-center text-[13px] leading-relaxed ${themeClasses.mutedText}`}
					style={{ color: lightStyles.mutedText.color }}
				>
					{settingsUrl ? (
						<>
							<Link
								href={settingsUrl}
								className={themeClasses.mutedLink}
								style={{ color: lightStyles.mutedText.color }}
							>
								Notification settings
							</Link>
							{unsubscribeUrl ? " · " : null}
						</>
					) : null}
					{unsubscribeUrl ? (
						<Link
							href={unsubscribeUrl}
							className={themeClasses.mutedLink}
							style={{ color: lightStyles.mutedText.color }}
						>
							Unsubscribe
						</Link>
					) : null}
				</Text>
			)}

			{complianceText ? (
				<Text
					className={`mt-[16px] text-center text-[11px] leading-relaxed ${themeClasses.secondaryText}`}
					style={{ color: lightStyles.secondaryText.color }}
				>
					{complianceText}
				</Text>
			) : null}

			<Text
				className={`mt-[12px] text-center text-[11px] ${themeClasses.secondaryText}`}
				style={{ color: lightStyles.secondaryText.color }}
			>
				Sonaraem
			</Text>
		</Section>
	);
}
