import { auth } from "@harmonia/auth";
import type { NextRequest } from "next/server";
import { client } from "@/utils/orpc";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ runId: string }> },
) {
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session?.user) {
		return new Response("Unauthorized", { status: 401 });
	}

	const { runId: runIdStr } = await params;
	const runId = Number.parseInt(runIdStr, 10);
	if (Number.isNaN(runId)) {
		return new Response("Invalid runId", { status: 400 });
	}

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: unknown) => {
				controller.enqueue(
					encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
				);
			};

			const POLL_INTERVAL = 2000;
			const MAX_POLLS = 900;
			let polls = 0;

			const poll = async () => {
				try {
					const run = await client.pipeline.getById({ id: runId });

					if (!run) {
						send("error", { message: "Pipeline run not found" });
						controller.close();
						return;
					}

					send("progress", {
						runId: run.id,
						status: run.status,
						currentStage: run.currentStage,
						progress: run.progress,
						startedAt: run.startedAt,
					});

					if (run.status === "completed" || run.status === "failed") {
						send(run.status, {
							runId: run.id,
							progress: run.progress,
							error: run.error,
							completedAt: run.completedAt,
						});
						controller.close();
						return;
					}

					polls++;
					if (polls >= MAX_POLLS) {
						send("error", { message: "Polling timeout" });
						controller.close();
						return;
					}

					setTimeout(
						() => poll().catch(() => controller.close()),
						POLL_INTERVAL,
					);
				} catch {
					send("error", { message: "Failed to fetch pipeline status" });
					controller.close();
				}
			};

			await poll().catch(() => controller.close());
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}
