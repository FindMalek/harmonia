import { rateLimiters } from "@sonaraem/orpc/utils/rate-limiter";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { serverClient } from "@/shared/api/orpc-server";

// Parse-then-verify-origin, not string pattern-matching: backslashes, raw
// control characters, etc. all get normalized by the URL parser the same way
// browsers do, so "/\evil.com" or "/\t/evil.com" resolve to a //evil.com
// redirect even though they don't textually start with "//". Comparing the
// parsed origin is the only check that can't be bypassed by encoding tricks.
function resolveSafeNext(
	nextParam: string | null,
	requestUrl: string,
	fallbackPath: string,
): URL {
	const fallback = new URL(fallbackPath, requestUrl);
	if (!nextParam) return fallback;
	try {
		const candidate = new URL(nextParam, requestUrl);
		return candidate.origin === new URL(requestUrl).origin
			? candidate
			: fallback;
	} catch {
		return fallback;
	}
}

export async function GET(req: NextRequest) {
	const { success } = rateLimiters.veryStrict.check(
		rateLimiters.veryStrict.getIdentifier(req.headers),
	);
	if (!success) {
		// Reached via browser navigation, not fetch — redirect to a friendly
		// page instead of a raw JSON error.
		return NextResponse.redirect(
			new URL("/waiting?reason=invalid_invite", req.url),
		);
	}

	const nextParam = req.nextUrl.searchParams.get("next");
	const nextUrl = resolveSafeNext(nextParam, req.url, "/introduction");

	const cookieStore = await cookies();
	const token = cookieStore.get("sonaraem_invite")?.value;
	// Delete the cookie regardless of outcome — one attempt only
	cookieStore.delete("sonaraem_invite");

	if (!token) {
		return NextResponse.redirect(new URL("/waiting", req.url));
	}

	try {
		const result = await serverClient.redeemInvite({ token });
		if (!result.success) {
			return NextResponse.redirect(
				new URL("/waiting?reason=invalid_invite", req.url),
			);
		}
	} catch {
		return NextResponse.redirect(
			new URL("/waiting?reason=invalid_invite", req.url),
		);
	}

	return NextResponse.redirect(nextUrl);
}
