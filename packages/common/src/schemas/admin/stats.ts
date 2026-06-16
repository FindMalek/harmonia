import { z } from "zod";

export const adminStatsOutputSchema = z.object({
	totalUsers: z.number(),
	totalTracks: z.number(),
	waitlistTotal: z.number(),
	waitlistPending: z.number(),
	waitlistApproved: z.number(),
	waitlistRejected: z.number(),
});
export type AdminStatsOutput = z.infer<typeof adminStatsOutputSchema>;
