import { z } from "zod";

export const emptyInput = z.object({});
export type EmptyInput = z.infer<typeof emptyInput>;
