import { inngest } from "@harmonia/common/inngest/client";
import { organizePipeline } from "@harmonia/common/inngest/functions/organize";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [organizePipeline],
});
