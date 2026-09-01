const GITHUB_ASSET_BASE_URL =
	"https://raw.githubusercontent.com/FindMalek/sonaraem/main/packages/email/public";

/** Base URL for hosted email assets (logo, etc.). */
export function getEmailAssetBaseUrl(): string {
	return GITHUB_ASSET_BASE_URL;
}

export function getEmailLogoUrl(): string {
	return `${getEmailAssetBaseUrl()}/email/logo.png`;
}

export function getEmailImageUrl(path: string): string {
	return `${getEmailAssetBaseUrl()}/email/images/${path}`;
}
