import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

import { apiEnv } from "./presets/api";

export const env = {
	...apiEnv,
	/** @deprecated Use NEXT_PUBLIC_SONARAEM_API_URL - API hosts auth */
	get SONARAEM_BETTER_AUTH_URL() {
		return apiEnv.NEXT_PUBLIC_SONARAEM_API_URL;
	},
	/** @deprecated Use NEXT_PUBLIC_SONARAEM_ALLOWED_ORIGIN */
	get SONARAEM_CORS_ORIGIN() {
		return (
			apiEnv.NEXT_PUBLIC_SONARAEM_ALLOWED_ORIGIN ??
			apiEnv.NEXT_PUBLIC_SONARAEM_API_URL
		);
	},
} as typeof apiEnv & {
	SONARAEM_BETTER_AUTH_URL: string;
	SONARAEM_CORS_ORIGIN: string;
};
