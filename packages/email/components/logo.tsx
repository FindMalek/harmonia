import { Img, Section } from "@react-email/components";
import { getEmailLogoUrl } from "../utils";

// "Ascending Pulse" mark — five uneven bars, same geometry used across the
// web/dashboard/admin app icons. See issue #148/#133.
const FALLBACK_LOGO_SRC =
	"data:image/svg+xml," +
	encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#2e9a3a"/><g fill="#fff"><rect x="8" y="23.2" width="3.6" height="6" rx="1.8"/><rect x="13.2" y="17.6" width="3.6" height="11.6" rx="1.8"/><rect x="18.4" y="12" width="3.6" height="17.2" rx="1.8"/><rect x="23.6" y="19.6" width="3.6" height="9.6" rx="1.8" opacity="0.55"/><rect x="28.8" y="15.2" width="3.6" height="14" rx="1.8" opacity="0.8"/></g></svg>`,
	);

export function Logo() {
	const logoSrc = (() => {
		try {
			return getEmailLogoUrl();
		} catch {
			return FALLBACK_LOGO_SRC;
		}
	})();

	return (
		<Section className="mt-[32px]">
			<Img
				src={logoSrc}
				width="40"
				height="40"
				alt="Harmonia"
				className="mx-auto my-0 block"
			/>
		</Section>
	);
}
