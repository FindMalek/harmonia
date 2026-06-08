export function isPro(user: {
	plan: string;
	planExpiresAt: Date | null;
}): boolean {
	if (user.plan !== "pro") return false;
	if (!user.planExpiresAt) return true;
	return user.planExpiresAt > new Date();
}
