import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

export async function assertUserApproved(userId: string): Promise<void> {
	const [row] = await db
		.select({ isApproved: user.isApproved, banned: user.banned })
		.from(user)
		.where(eq(user.id, userId));

	if (!row || row.banned || !row.isApproved) {
		throw new ORPCError("FORBIDDEN");
	}
}
