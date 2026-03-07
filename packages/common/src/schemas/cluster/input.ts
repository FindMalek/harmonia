import { z } from "zod";

export const clusterGetByIdInput = z.object({
	id: z.number(),
});
export type ClusterGetByIdInput = z.infer<typeof clusterGetByIdInput>;
