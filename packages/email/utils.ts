/** Base URL for hosted email assets (logo, etc.). */
export function getEmailAssetBaseUrl(): string {
	const fromEnv =
		process.env.NEXT_PUBLIC_HARMONIA_DASHBOARD_URL ??
		process.env.NEXT_PUBLIC_HARMONIA_API_URL;
	if (fromEnv) {
		return fromEnv.replace(/\/$/, "");
	}
	return "http://127.0.0.1:3003";
}

export function getEmailLogoUrl(): string {
	return `${getEmailAssetBaseUrl()}/email/logo.png`;
}

export function getEmailImageUrl(path: string): string {
	return `${getEmailAssetBaseUrl()}/email/images/${path}`;
}
