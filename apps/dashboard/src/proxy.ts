import { resolveWaitlistGate } from "@harmonia/common/utils/waitlist-gate";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSessionFromCookie } from "@/shared/api/session.server";

// Single source of truth for waitlist-approval gating. Excluded from the
// matcher: /login (returning approved users), /waiting, /invite-expired,
// and the invite routes (they issue their own redirects).
export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|api/invite|api/redeem-invite|waiting|invite-expired|login).*)",
	],
};

export async function proxy(request: NextRequest) {
	const hasInvite = request.cookies.has("harmonia_invite");
	const session = await getSessionFromCookie(request.headers.get("cookie"));

	const decision = resolveWaitlistGate(
		{
			hasSession: !!session?.user,
			isApproved: session?.user?.isApproved ?? false,
			hasInviteCookie: hasInvite,
			pathname: request.nextUrl.pathname,
			search: request.nextUrl.search,
		},
		env.NEXT_PUBLIC_HARMONIA_WEB_URL,
	);

	if (decision.action === "next") {
		return NextResponse.next();
	}

	if (decision.action === "redirect_external") {
		return NextResponse.redirect(decision.url);
	}

	return NextResponse.redirect(new URL(decision.path, request.url));
}
