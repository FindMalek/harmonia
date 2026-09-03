import type { Page } from "playwright";

const TABLE_SELECTOR = 'table[data-encore-id="table"]';

export async function scrapeAllowlistEmails(page: Page): Promise<string[]> {
	const rows = page.locator(`${TABLE_SELECTOR} tbody tr`);
	const count = await rows.count();
	const emails: string[] = [];
	for (let i = 0; i < count; i++) {
		const email = await rows.nth(i).locator("td").nth(2).innerText();
		emails.push(email.trim().toLowerCase());
	}
	return emails;
}

// "Full Name" has no visible `required` attribute, but we fill it anyway to be safe — the local part of the email is a fine placeholder.
export async function addAllowlistUser(
	page: Page,
	email: string,
): Promise<void> {
	await page.getByRole("button", { name: "Add user", exact: true }).click();
	await page.locator("#email").waitFor({ state: "visible" });
	await page.locator("#name").fill(email.split("@")[0] ?? email);
	await page.locator("#email").fill(email);
	await page.locator(`form button[type="submit"]`).click();
}

export async function removeAllowlistUser(
	page: Page,
	email: string,
): Promise<void> {
	const rows = page.locator(`${TABLE_SELECTOR} tbody tr`);
	const count = await rows.count();
	const target = email.toLowerCase();

	for (let i = 0; i < count; i++) {
		const row = rows.nth(i);
		const rowEmail = (await row.locator("td").nth(2).innerText())
			.trim()
			.toLowerCase();
		if (rowEmail !== target) continue;

		await row.getByRole("button", { name: "User options" }).click();
		await page.getByRole("button", { name: "Remove user" }).click();
		return;
	}

	throw new Error(`${email} not found in the allowlist table to remove`);
}
