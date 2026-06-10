/**
 * Checks if the user has an active Pro plan.
 * 
 * Returns true if the plan is 'pro' and has not expired (or has no expiry date).
 * 
 * @param user - Object containing the user's plan name and optional expiration date.
 * @returns True if the user is currently on an active Pro plan.
 */
export function isPro(user: {
	plan: string;
	planExpiresAt: Date | null;
}): boolean {
	if (user.plan !== "pro") return false;
	if (!user.planExpiresAt) return true;
	return user.planExpiresAt > new Date();
}
