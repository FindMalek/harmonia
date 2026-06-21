import { serverClient } from "@/shared/api/orpc-server";
import { rateLimiters } from "@harmonia/orpc/utils/rate-limiter";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isSafeRelativePath(value: string | null): value is string {
	return !!value && value.startsWith("/") && !value.startsWith("//");
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
	const nextPath = isSafeRelativePath(nextParam) ? nextParam : "/introduction";

	const cookieStore = await cookies();
	const token = cookieStore.get("harmonia_invite")?.value;
	// Delete the cookie regardless of outcome — one attempt only
	cookieStore.delete("harmonia_invite");

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

	return NextResponse.redirect(new URL(nextPath, req.url));
}
