import { z } from "zod";

export const organizeRunInput = z.object({
	userId: z.string().optional(),
});
export type OrganizeRunInput = z.infer<typeof organizeRunInput>;
