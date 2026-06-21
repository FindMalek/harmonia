import { z } from "zod";

export const adminStatsOutputSchema = z.object({
	totalUsers: z.number().int().min(0),
	totalTracks: z.number().int().min(0),
	waitlistTotal: z.number().int().min(0),
	waitlistPending: z.number().int().min(0),
	waitlistApproved: z.number().int().min(0),
	waitlistRejected: z.number().int().min(0),
	totalPipelineRuns: z.number().int().min(0),
	completedPipelineRuns: z.number().int().min(0),
	totalPlaylistsGenerated: z.number().int().min(0),
	playlistsExportedToSpotify: z.number().int().min(0),
});
export type AdminStatsOutput = z.infer<typeof adminStatsOutputSchema>;
