import { Img, Section } from "@react-email/components";
import { getEmailLogoUrl } from "../utils";

const FALLBACK_LOGO_SRC =
	"data:image/svg+xml," +
	encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#2e9a3a"/><path d="M12 28V12h6.2c3.4 0 5.8 2.1 5.8 5.4 0 2.2-1.2 3.8-3.1 4.5L26 28h-4.8l-4.4-5.4H16.2V28H12zm4.2-9.2h2c1.5 0 2.4-.8 2.4-2.1s-.9-2.1-2.4-2.1h-2v4.2z" fill="#fff"/></svg>`,
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
			<style>{`
          .logo-blend {
            filter: none;
          }

          @media (prefers-color-scheme: dark) {
            .logo-blend:not([class^="x_"]):not(.disable-dark-mode .logo-blend) {
              filter: invert(1) brightness(1.1);
            }
          }

          [data-ogsb]:not(.disable-dark-mode) .logo-blend,
          [data-ogsc]:not(.disable-dark-mode) .logo-blend {
            filter: invert(1) brightness(1.1);
          }

          .disable-dark-mode .logo-blend {
            filter: none !important;
          }
        `}</style>
			<Img
				src={logoSrc}
				width="40"
				height="40"
				alt="Harmonia"
				className="logo-blend mx-auto my-0 block"
			/>
		</Section>
	);
}
