import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const { chromium } = await import("playwright");
const { saveAllowlistSession } = await import(
	"../src/services/spotify-allowlist/session"
);

// Best-effort convenience, macOS only — never worth failing the script over.
function copyToClipboard(text: string): boolean {
	if (process.platform !== "darwin") return false;
	try {
		execFileSync("pbcopy", { input: text });
		return true;
	} catch {
		return false;
	}
}

// Run by hand — opens a visible browser so a human can log in (OTP included), then saves the resulting session.
async function main() {
	console.info("Opening a browser — log into the automation account by hand.");

	const adminEmail = process.env.SONARAEM_SPOTIFY_ALLOWLIST_ADMIN_EMAIL;
	if (adminEmail && copyToClipboard(adminEmail)) {
		console.info(
			`Copied the automation account's email to your clipboard: ${adminEmail} — just paste it into the email field.`,
		);
	} else if (adminEmail) {
		console.info(`Automation account email: ${adminEmail}`);
	} else {
		console.info(
			"Set SONARAEM_SPOTIFY_ALLOWLIST_ADMIN_EMAIL in .env to have this copied to your clipboard automatically next time.",
		);
	}
	console.info(
		"Once you're on the Dashboard (past any OTP prompt), press Enter here.",
	);

	const browser = await chromium.launch({ headless: false });
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto("https://developer.spotify.com/dashboard");

	await new Promise<void>((resolve) => {
		process.stdin.once("data", () => resolve());
	});

	const state = await context.storageState();
	await saveAllowlistSession(JSON.stringify(state));
	await browser.close();

	console.info("Session saved.");
	process.exit(0);
}

await main().catch((err) => {
	console.error(err);
	process.exit(1);
});
