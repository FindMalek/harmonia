import { describe, expect, it } from "vitest";

import { determineReauthReminderStage } from "../reauth-reminder";

const NOW = new Date("2026-08-09T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * DAY_MS);

describe("determineReauthReminderStage", () => {
	it("returns null when expiry is more than 14 days out", () => {
		expect(determineReauthReminderStage(daysFromNow(20), null, NOW)).toBeNull();
	});

	it("returns 14d when within the 14-day window and no reminder sent yet", () => {
		expect(determineReauthReminderStage(daysFromNow(10), null, NOW)).toBe(
			"14d",
		);
	});

	it("does not resend 14d once already sent", () => {
		expect(
			determineReauthReminderStage(daysFromNow(10), "14d", NOW),
		).toBeNull();
	});

	it("returns 3d when within the 3-day window, regardless of prior 14d send", () => {
		expect(determineReauthReminderStage(daysFromNow(2), "14d", NOW)).toBe("3d");
	});

	it("catches up straight to 3d if the 14d window was missed entirely", () => {
		expect(determineReauthReminderStage(daysFromNow(2), null, NOW)).toBe("3d");
	});

	it("never resends once 3d has been sent — that's the final stage", () => {
		expect(determineReauthReminderStage(daysFromNow(1), "3d", NOW)).toBeNull();
		expect(determineReauthReminderStage(daysFromNow(-5), "3d", NOW)).toBeNull();
	});

	it("returns 3d for an already-past expiry that never got a reminder", () => {
		expect(determineReauthReminderStage(daysFromNow(-1), null, NOW)).toBe("3d");
	});
});
