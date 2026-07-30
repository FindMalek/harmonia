import { describe, expect, it } from "vitest";

import { resolveWaitlistGate } from "../waitlist-gate";

describe("resolveWaitlistGate", () => {
	it("allows approved session through", () => {
		expect(
			resolveWaitlistGate({
				hasSession: true,
				isApproved: true,
				hasInviteCookie: false,
				pathname: "/",
				search: "",
			}),
		).toEqual({ action: "next" });
	});

	it("redirects unauthenticated users without invite to web", () => {
		expect(
			resolveWaitlistGate(
				{
					hasSession: false,
					isApproved: false,
					hasInviteCookie: false,
					pathname: "/",
					search: "",
				},
				"http://127.0.0.1:3001",
			),
		).toEqual({ action: "redirect_external", url: "http://127.0.0.1:3001" });
	});

	it("allows unauthenticated invite cookie holders through", () => {
		expect(
			resolveWaitlistGate({
				hasSession: false,
				isApproved: false,
				hasInviteCookie: true,
				pathname: "/login",
				search: "",
			}),
		).toEqual({ action: "next" });
	});

	it("sends unapproved session with invite to redeem", () => {
		const result = resolveWaitlistGate({
			hasSession: true,
			isApproved: false,
			hasInviteCookie: true,
			pathname: "/introduction",
			search: "",
		});
		expect(result.action).toBe("redirect");
		if (result.action === "redirect") {
			expect(result.path).toBe("/api/redeem-invite?next=%2Fintroduction");
		}
	});

	it("sends unapproved session without invite to waiting", () => {
		expect(
			resolveWaitlistGate({
				hasSession: true,
				isApproved: false,
				hasInviteCookie: false,
				pathname: "/",
				search: "",
			}),
		).toEqual({ action: "redirect", path: "/waiting" });
	});
});
