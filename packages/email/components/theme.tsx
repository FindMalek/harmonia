import { Font, Head, Html, Tailwind } from "@react-email/components";
import type React from "react";

export { Button } from "./button";

/**
 * Email-local hex palette — derived from dashboard `--primary` / `--foreground`
 * in packages/ui/src/styles/globals.css; not shared at runtime with the app Tailwind theme.
 */
export const emailTheme = {
	light: {
		background: "#ffffff",
		foreground: "#1a1a18",
		muted: "#6b7280",
		border: "#e8e8e6",
		accent: "#2e9a3a",
		secondary: "#878787",
	},
	dark: {
		background: "#0f0f0f",
		foreground: "#f5f5f4",
		muted: "#9ca3af",
		border: "#2a2a28",
		accent: "#5ecf5e",
		secondary: "#9ca3af",
	},
} as const;

export const getEmailDarkModeCSS = () => {
	return `
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }

    @media (prefers-color-scheme: dark) {
      .email-body {
        background-color: ${emailTheme.dark.background} !important;
        color: ${emailTheme.dark.foreground} !important;
      }
      .email-container {
        border-color: ${emailTheme.dark.border} !important;
      }
      .email-text {
        color: ${emailTheme.dark.foreground} !important;
      }
      .email-muted {
        color: ${emailTheme.dark.muted} !important;
      }
      .email-secondary {
        color: ${emailTheme.dark.secondary} !important;
      }
      .email-accent {
        color: ${emailTheme.dark.accent} !important;
        border-color: ${emailTheme.dark.accent} !important;
      }
      .email-border {
        border-color: ${emailTheme.dark.border} !important;
      }
      .email-highlight {
        background-color: #1a1a1a !important;
        border-color: ${emailTheme.dark.border} !important;
      }
      .email-highlight-text {
        color: ${emailTheme.dark.foreground} !important;
      }
      .dark-mode-hide {
        display: none !important;
      }
      .dark-mode-show {
        display: block !important;
      }
    }

    @media (prefers-color-scheme: dark) {
      .gmail_dark .email-body,
      .gmail_dark_theme .email-body,
      [data-darkmode="true"] .email-body {
        background-color: ${emailTheme.dark.background} !important;
        color: ${emailTheme.dark.foreground} !important;
      }
      .gmail_dark .email-container,
      .gmail_dark_theme .email-container,
      [data-darkmode="true"] .email-container {
        border-color: ${emailTheme.dark.border} !important;
      }
      .gmail_dark .email-text,
      .gmail_dark_theme .email-text,
      [data-darkmode="true"] .email-text {
        color: ${emailTheme.dark.foreground} !important;
      }
      .gmail_dark .email-muted,
      .gmail_dark_theme .email-muted,
      [data-darkmode="true"] .email-muted {
        color: ${emailTheme.dark.muted} !important;
      }
      .gmail_dark .email-accent,
      .gmail_dark_theme .email-accent,
      [data-darkmode="true"] .email-accent {
        color: ${emailTheme.dark.accent} !important;
        border-color: ${emailTheme.dark.accent} !important;
      }
      .gmail_dark .email-highlight,
      .gmail_dark_theme .email-highlight,
      [data-darkmode="true"] .email-highlight {
        background-color: #1a1a1a !important;
        border-color: ${emailTheme.dark.border} !important;
      }
      .gmail_dark .email-highlight-text,
      .gmail_dark_theme .email-highlight-text,
      [data-darkmode="true"] .email-highlight-text {
        color: ${emailTheme.dark.foreground} !important;
      }
    }

    [data-ogsc] .email-text {
      color: ${emailTheme.dark.foreground} !important;
    }
    [data-ogsc] .email-muted {
      color: ${emailTheme.dark.muted} !important;
    }
    [data-ogsc] .email-accent {
      color: ${emailTheme.dark.accent} !important;
      border-color: ${emailTheme.dark.accent} !important;
    }
    [data-ogsc] .email-highlight {
      background-color: #1a1a1a !important;
      border-color: ${emailTheme.dark.border} !important;
    }
    [data-ogsc] .email-highlight-text {
      color: ${emailTheme.dark.foreground} !important;
    }
    [data-ogsc] .dark-mode-hide {
      display: none !important;
    }
    [data-ogsc] .dark-mode-show {
      display: block !important;
    }

    [data-ogsb] .email-body {
      background-color: ${emailTheme.dark.background} !important;
    }
    [data-ogsb] .email-container {
      border-color: ${emailTheme.dark.border} !important;
    }
  `;
};

interface EmailThemeProviderProps {
	children: React.ReactNode;
	preview?: React.ReactNode;
	additionalHeadContent?: React.ReactNode;
}

export function EmailThemeProvider({
	children,
	preview,
	additionalHeadContent,
}: EmailThemeProviderProps) {
	return (
		<Html>
			<Tailwind
				config={{
					theme: {
						extend: {
							fontFamily: {
								sans: [
									"Inter",
									"system-ui",
									"-apple-system",
									"Arial",
									"sans-serif",
								],
								serif: ["Georgia", "Times New Roman", "serif"],
							},
							colors: {
								brand: emailTheme.light.accent,
							},
						},
					},
				}}
			>
				<Head>
					<meta name="color-scheme" content="light dark" />
					<meta name="supported-color-schemes" content="light dark" />
					<meta
						name="theme-color"
						content={emailTheme.dark.background}
						media="(prefers-color-scheme: dark)"
					/>
					<meta
						name="theme-color"
						content={emailTheme.light.background}
						media="(prefers-color-scheme: light)"
					/>
					<style>{getEmailDarkModeCSS()}</style>
					<Font
						fontFamily="Inter"
						fallbackFontFamily={["Arial", "Helvetica", "sans-serif"]}
						webFont={{
							url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
							format: "woff2",
						}}
						fontWeight={400}
						fontStyle="normal"
					/>
					{additionalHeadContent}
				</Head>
				{preview}
				{children}
			</Tailwind>
		</Html>
	);
}

export function getEmailThemeClasses() {
	return {
		body: "email-body",
		container: "email-container",
		heading: "email-text",
		text: "email-text",
		mutedText: "email-muted",
		secondaryText: "email-secondary",
		button: "email-accent",
		border: "email-border",
		link: "email-text",
		mutedLink: "email-muted",
		highlight: "email-highlight",
		highlightText: "email-highlight-text",
		hideInDark: "dark-mode-hide",
		showInDark: "dark-mode-show",
	};
}

export function getEmailInlineStyles(mode: "light" | "dark" = "light") {
	const theme = emailTheme[mode];
	return {
		body: {
			backgroundColor: theme.background,
			color: theme.foreground,
		},
		container: {
			borderColor: theme.border,
		},
		text: {
			color: theme.foreground,
		},
		mutedText: {
			color: theme.muted,
		},
		secondaryText: {
			color: theme.secondary,
		},
		button: {
			color: theme.accent,
			borderColor: theme.accent,
		},
	};
}

export function useEmailTheme() {
	return {
		classes: getEmailThemeClasses(),
		lightStyles: getEmailInlineStyles("light"),
	};
}
