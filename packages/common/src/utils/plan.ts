// packages/common/src/utils/plan.ts
export function isPro(user: { plan?: string | null; planExpiresAt?: Date | string | null }): boolean {
	if (!user || user.plan !== "pro") return false;
	if (!user.planExpiresAt) return true;
	const expiry = typeof user.planExpiresAt === "string" ? new Date(user.planExpiresAt) : user.planExpiresAt;
	return expiry > new Date();
}
