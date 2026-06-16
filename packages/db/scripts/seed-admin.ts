import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(repoRoot, ".env") });

const { createAuth } = await import("@harmonia/auth");
const { db } = await import("@harmonia/db");
const { apiEnv } = await import("@harmonia/env/presets/api");

const auth = createAuth(db, {
	HARMONIA_BETTER_AUTH_SECRET: apiEnv.HARMONIA_BETTER_AUTH_SECRET,
	NEXT_PUBLIC_HARMONIA_API_URL: apiEnv.NEXT_PUBLIC_HARMONIA_API_URL,
	NEXT_PUBLIC_HARMONIA_ADMIN_URL: apiEnv.NEXT_PUBLIC_HARMONIA_ADMIN_URL,
	NEXT_PUBLIC_HARMONIA_DASHBOARD_URL: apiEnv.NEXT_PUBLIC_HARMONIA_DASHBOARD_URL,
	NEXT_PUBLIC_HARMONIA_ALLOWED_ORIGIN:
		apiEnv.NEXT_PUBLIC_HARMONIA_ALLOWED_ORIGIN,
	HARMONIA_SPOTIFY_CLIENT_ID: apiEnv.HARMONIA_SPOTIFY_CLIENT_ID,
	HARMONIA_SPOTIFY_CLIENT_SECRET: apiEnv.HARMONIA_SPOTIFY_CLIENT_SECRET,
});

const ADMIN_EMAIL = process.env.HARMONIA_ADMIN_EMAIL ?? "admin@harmonia.com";
const ADMIN_PASSWORD = process.env.HARMONIA_ADMIN_PASSWORD ?? "changeme123!";
const ADMIN_NAME = "Harmonia Admin";

async function main() {
	console.info(`Creating admin user: ${ADMIN_EMAIL}`);

	const result = await auth.api.createUser({
		body: {
			name: ADMIN_NAME,
			email: ADMIN_EMAIL,
			password: ADMIN_PASSWORD,
			role: "admin",
		},
	});

	if (!result?.user) {
		console.error("Failed to create admin user — may already exist.");
		console.info(
			`If user exists, run: UPDATE "user" SET role = 'admin' WHERE email = '${ADMIN_EMAIL}';`,
		);
		process.exit(1);
	}

	console.info(
		`Admin user created: ${result.user.email} (id: ${result.user.id})`,
	);
	console.info(`Password: ${ADMIN_PASSWORD}`);
	console.info("Login at: http://127.0.0.1:3004/login");
}

await main().catch((err) => {
	console.error(err);
	process.exit(1);
});
