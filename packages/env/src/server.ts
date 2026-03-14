import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

import { apiEnv } from "./presets/api";

export const env = {
	...apiEnv,
	/** @deprecated Use NEXT_PUBLIC_HARMONIA_API_URL - API hosts auth */
	get HARMONIA_BETTER_AUTH_URL() {
		return apiEnv.NEXT_PUBLIC_HARMONIA_API_URL;
	},
	/** @deprecated Use NEXT_PUBLIC_HARMONIA_ALLOWED_ORIGIN */
	get HARMONIA_CORS_ORIGIN() {
		return (
			apiEnv.NEXT_PUBLIC_HARMONIA_ALLOWED_ORIGIN ??
			apiEnv.NEXT_PUBLIC_HARMONIA_API_URL
		);
	},
} as typeof apiEnv & {
	HARMONIA_BETTER_AUTH_URL: string;
	HARMONIA_CORS_ORIGIN: string;
};
