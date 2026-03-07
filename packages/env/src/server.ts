import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

import { apiEnv } from "./presets/api";

export const env = {
	...apiEnv,
	/** @deprecated Use NEXT_PUBLIC_API_URL - API hosts auth */
	get BETTER_AUTH_URL() {
		return apiEnv.NEXT_PUBLIC_API_URL;
	},
	/** @deprecated Use NEXT_PUBLIC_ALLOWED_ORIGIN */
	get CORS_ORIGIN() {
		return apiEnv.NEXT_PUBLIC_ALLOWED_ORIGIN ?? apiEnv.NEXT_PUBLIC_API_URL;
	},
} as typeof apiEnv & {
	BETTER_AUTH_URL: string;
	CORS_ORIGIN: string;
};
