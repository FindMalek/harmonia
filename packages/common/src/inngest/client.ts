import { Inngest } from "inngest";

// Get environment variables
const eventKey = process.env.INNGEST_EVENT_KEY;
const isDev =
	process.env.NEXT_PUBLIC_HARMONIA_NODE_ENV === "local" ||
	process.env.NODE_ENV === "development";

// Create a client to send and receive events
// In local dev without a key: connects to Inngest Dev Server at localhost:8288
// In production with a key: connects to Inngest Cloud
export const inngest = new Inngest({
	id: "harmonia",
	...(eventKey ? { eventKey } : {}),
	// In local dev, automatically use the Dev Server if no key is provided
	...(isDev && !eventKey ? { isDev: true } : {}),
});
