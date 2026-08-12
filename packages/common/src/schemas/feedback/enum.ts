import { z } from "zod";

export const feedbackSourceEnum = z.enum(["email_feedback_3day", "in_app"]);
export type FeedbackSource = z.infer<typeof feedbackSourceEnum>;
