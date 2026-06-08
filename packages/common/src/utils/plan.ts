/**
 * Helper to check if a user has an active Pro plan.
 * 
 * @param user - The user object containing plan information.
 * @returns boolean - True if the user has an active pro plan.
 */
export function isPro(user: { plan: string; planExpiresAt: Date | null }): boolean {
  if (user.plan !== "pro") return false;
  if (!user.planExpiresAt) return true;
  return user.planExpiresAt > new Date();
}
