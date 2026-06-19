import { serverClient } from "@/shared/api/orpc-server";
import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
	const next = req.nextUrl.searchParams.get("next") ?? "/introduction";
	const cookieStore = await cookies();
	const token = cookieStore.get("harmonia_invite")?.value;

	// Delete the cookie regardless of outcome — one attempt only
	cookieStore.delete("harmonia_invite");

	if (!token) {
		redirect("/waiting");
	}

	try {
		const result = await serverClient.redeemInvite({ token });
		if (!result.success) {
			redirect("/waiting?reason=invalid_invite");
		}
	} catch {
		redirect("/waiting?reason=invalid_invite");
	}

	redirect(next as Route);
}
