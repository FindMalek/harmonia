import { Button as ReactEmailButton } from "@react-email/components";
import type React from "react";
import { getEmailInlineStyles, getEmailThemeClasses } from "./theme";

interface ButtonProps {
	href: string;
	children: React.ReactNode;
	variant?: "primary" | "secondary";
	className?: string;
}

export function Button({
	href,
	children,
	variant = "primary",
	className = "",
}: ButtonProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");

	const baseClasses =
		"bg-transparent text-[14px] font-medium no-underline text-center px-6 py-3 border border-solid";
	const variantClasses =
		variant === "primary"
			? themeClasses.button
			: "border-gray-300 text-gray-600";

	const buttonStyle =
		variant === "primary"
			? {
					color: lightStyles.button.color,
					borderColor: lightStyles.button.borderColor,
				}
			: {
					color: lightStyles.mutedText.color,
					borderColor: lightStyles.container.borderColor,
				};

	return (
		<ReactEmailButton
			className={`${baseClasses} ${variantClasses} ${className}`}
			href={href}
			style={buttonStyle}
		>
			{children}
		</ReactEmailButton>
	);
}
