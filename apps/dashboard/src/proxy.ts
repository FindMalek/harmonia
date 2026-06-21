import { env } from "@/lib/env";
import { getSessionFromCookie } from "@/shared/api/session.server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Single source of truth for waitlist-approval gating. Excluded from the
// matcher: /waiting and /invite-expired (must stay reachable with no session
// at all — the confirmation email links anonymous users here) and the two
// invite routes (they issue their own redirects).
export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|api/invite|api/redeem-invite|waiting|invite-expired).*)",
	],
};

export async function proxy(request: NextRequest) {
	const hasInvite = request.cookies.has("harmonia_invite");
	const session = await getSessionFromCookie(request.headers.get("cookie"));

	if (!session?.user) {
		// No claim to be here at all — bounce out to the public waitlist site.
		if (hasInvite) return NextResponse.next();
		const webUrl = env.NEXT_PUBLIC_HARMONIA_WEB_URL;
		return NextResponse.redirect(webUrl ?? new URL("/waiting", request.url));
	}

	if (session.user.isApproved) {
		return NextResponse.next();
	}

	if (hasInvite) {
		const { pathname, search } = request.nextUrl;
		const next = encodeURIComponent(`${pathname}${search}`);
		return NextResponse.redirect(
			new URL(`/api/redeem-invite?next=${next}`, request.url),
		);
	}

	return NextResponse.redirect(new URL("/waiting", request.url));
}
