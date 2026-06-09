import { env } from "@harmonia/env/server";
import { polar } from "@harmonia/common/services/billing/polar";
import { auth } from "@harmonia/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Initializes a new Polar.sh checkout session for a user.
 *
 * Authenticates the request, generates a checkout URL for the specified
 * Polar product, and redirects the user to the Polar checkout page.
 *
 * @param req - The Request object containing the checkout parameters.
 * @returns A NextResponse redirecting to the Polar checkout URL, or an error response.
 */
export async function POST(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	try {
		const { productId } = await req.json();

		if (typeof productId !== "string" || productId.trim().length === 0) {
			return new NextResponse("Valid Product ID is required", { status: 400 });
		}

		const result = await polar.checkouts.custom.create({
			productId,
			successUrl: `${env.NEXT_PUBLIC_HARMONIA_DASHBOARD_URL}/billing/success`,
			customerEmail: session.user.email,
			metadata: {
				userId: session.user.id,
			},
		});

		return NextResponse.json({ url: result.url });
	} catch (error) {
		console.error("[POLAR_CHECKOUT_ERROR]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
