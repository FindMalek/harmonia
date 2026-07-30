export type WaitlistGateInput = {
	hasSession: boolean;
	isApproved: boolean;
	hasInviteCookie: boolean;
	pathname: string;
	search: string;
};

export type WaitlistGateResult =
	| { action: "next" }
	| { action: "redirect"; path: string }
	| { action: "redirect_external"; url: string };

export function resolveWaitlistGate(
	input: WaitlistGateInput,
	webUrl?: string,
): WaitlistGateResult {
	const { hasSession, isApproved, hasInviteCookie, pathname, search } = input;

	if (!hasSession) {
		if (hasInviteCookie) {
			return { action: "next" };
		}
		if (webUrl) {
			return { action: "redirect_external", url: webUrl };
		}
		return { action: "redirect", path: "/waiting" };
	}

	if (isApproved) {
		return { action: "next" };
	}

	if (hasInviteCookie) {
		const next = encodeURIComponent(`${pathname}${search}`);
		return { action: "redirect", path: `/api/redeem-invite?next=${next}` };
	}

	return { action: "redirect", path: "/waiting" };
}
