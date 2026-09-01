import { describe, expect, it, vi } from "vitest";

vi.mock("@sonaraem/env/server", () => ({
	env: {
		SONARAEM_BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
	},
}));

import {
	signWaitlistStatusToken,
	verifyWaitlistStatusToken,
} from "../waitlist-token";

describe("waitlist-token", () => {
	it("signs and verifies a valid token", () => {
		const token = signWaitlistStatusToken("user@example.com");
		const verified = verifyWaitlistStatusToken(token);
		expect(verified?.email).toBe("user@example.com");
	});

	it("normalizes email casing", () => {
		const token = signWaitlistStatusToken("User@Example.COM");
		const verified = verifyWaitlistStatusToken(token);
		expect(verified?.email).toBe("user@example.com");
	});

	it("rejects tampered tokens", () => {
		const token = signWaitlistStatusToken("user@example.com");
		const tampered = `${token}x`;
		expect(verifyWaitlistStatusToken(tampered)).toBeNull();
	});

	it("rejects malformed tokens", () => {
		expect(verifyWaitlistStatusToken("not-a-token")).toBeNull();
		expect(verifyWaitlistStatusToken("")).toBeNull();
	});
});
