/**
 * Helper to check if a user has an active Pro plan.
 *
 * @param user - The user object containing plan information.
 * @returns boolean - True if the user has an active pro plan.
 */
export function isPro(user?: {
	plan?: string | null;
	planExpiresAt?: Date | string | null;
}): boolean {
	if (!user || user.plan !== "pro") return false;
	if (!user.planExpiresAt) return true;

	const expiresAt =
		typeof user.planExpiresAt === "string"
			? new Date(user.planExpiresAt)
			: user.planExpiresAt;

	return expiresAt > new Date();
}
