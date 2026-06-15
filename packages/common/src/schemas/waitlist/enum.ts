import { z } from "zod";

export const waitlistStatusEnum = z.enum(["pending", "approved", "rejected"]);
export type WaitlistStatus = z.infer<typeof waitlistStatusEnum>;
