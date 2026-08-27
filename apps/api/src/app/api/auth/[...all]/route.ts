import { auth } from "@sonaraem/core";
import { toNextJsHandler } from "better-auth/next-js";
import { createAuthRouteHandlers } from "@/lib/auth-route";

export const dynamic = "force-dynamic";

const handlers = createAuthRouteHandlers(toNextJsHandler(auth.handler));

export const GET = handlers.GET;
export const POST = handlers.POST;
export const OPTIONS = handlers.OPTIONS;
