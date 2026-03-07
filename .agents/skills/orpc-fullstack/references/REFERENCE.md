# oRPC Full Reference

Complete documentation for oRPC v1.12+ with detailed code examples.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Contract-First Development](#contract-first-development)
3. [Procedures](#procedures)
4. [Middleware](#middleware)
5. [Routers](#routers-without-contracts)
6. [Context](#context)
7. [Error Handling](#error-handling)
8. [Server Handlers & Hono Integration](#server-handlers--hono-integration)
9. [Client Setup](#client-setup)
10. [TanStack Query Integration](#tanstack-query-integration)
11. [Event Iterator (SSE / Streaming)](#event-iterator-sse--streaming)
12. [AI SDK Integration](#ai-sdk-integration)
13. [Plugins](#plugins)
14. [File Upload / Download](#file-upload--download)
15. [Metadata](#metadata)

---

## Project Structure

Organize by **domain modules** with paired contract + router files. Middleware lives in its own directory. Barrel files compose everything.

```
src/
  index.ts                              # Hono app + handler setup
  lib/
    auth.ts                             # Auth config (e.g. better-auth)
    utils.ts                            # Shared helpers
  middlewares/
    auth-middleware.ts                   # Session validation -> injects user
    user-in-channel-middleware.ts        # Channel membership guard (input-aware)
    user-is-channel-owner-middleware.ts  # Ownership guard (input-aware)
  modules/
    contract.ts                         # Root barrel: all contracts
    router.ts                           # Root barrel: all routers
    health/
      health.contract.ts
      health.router.ts
    user/
      user.contract.ts
      user.router.ts
    chat/
      chat.contract.ts                  # Sub-barrel: channel + message contracts
      chat.router.ts                    # Sub-barrel: channel + message routers
      channel/
        channel.contract.ts
        channel.router.ts
      message/
        message.contract.ts
        message.router.ts
```

### Barrel files

Root barrels compose all domain modules into a single router/contract:

```ts
// modules/contract.ts
import chat from "./chat/chat.contract";
import health from "./health/health.contract";
import user from "./user/user.contract";
export default { health, chat, user };

// modules/router.ts
import chat from "./chat/chat.router";
import health from "./health/health.router";
import user from "./user/user.router";
export default { health, chat, user };
```

Sub-barrels compose nested modules:

```ts
// modules/chat/chat.contract.ts
import channel from "./channel/channel.contract";
import message from "./message/message.contract";
export default { channel, message };

// modules/chat/chat.router.ts
import channel from "./channel/channel.router";
import message from "./message/message.router";
export default { channel, message };
```

## Contract-First Development

Contracts define the API shape (inputs, outputs, errors, HTTP routes) without any handler logic. Routers implement contracts — TypeScript enforces the match.

### Defining contracts

```ts
// modules/user/user.contract.ts
import { oc } from "@orpc/contract";
import { z } from "zod/v4";

// Base contract with shared config
const userContract = oc
  .route({ tags: ["user"] })
  .errors({ UNAUTHORIZED: {} });

const searchUser = userContract
  .route({
    method: "POST",
    description: "Search for a user",
    path: "/user/search",
  })
  .input(z.object({
    query: z.string().describe("The query to search for"),
  }))
  .output(z.array(userSchema));

export default { searchUser };
```

A more complex contract with multiple procedures and typed errors:

```ts
// modules/chat/channel/channel.contract.ts
import { oc } from "@orpc/contract";
import { z } from "zod/v4";

const channelContract = oc
  .route({ tags: ["chat", "channel"] })
  .errors({ UNAUTHORIZED: {} });

const getChannels = channelContract
  .route({ method: "GET", path: "/chat/channel" })
  .output(z.array(channelSchema));

const createChannel = channelContract
  .route({ method: "POST", path: "/chat/channel", successStatus: 201 })
  .errors({ INTERNAL_SERVER_ERROR: {} })
  .input(z.object({
    name: z.string().min(1),
    members: z.array(z.string()).min(1),
  }))
  .output(channelSchema);

const getChannel = channelContract
  .route({ method: "GET", path: "/chat/channel/{uuid}" })
  .errors({
    FORBIDDEN: { message: "You are not a member of this channel" },
    NOT_FOUND: { message: "Channel not found" },
  })
  .input(z.object({ uuid: z.uuid() }))
  .output(channelWithParticipantsSchema);

const deleteChannel = channelContract
  .route({ method: "DELETE", path: "/chat/channel/{uuid}" })
  .errors({
    FORBIDDEN: { message: "You are not the owner of this channel" },
    NOT_FOUND: { message: "Channel not found" },
  })
  .input(z.object({ uuid: z.uuid() }));

export default { getChannels, createChannel, getChannel, deleteChannel };
```

### Event iterators in contracts

```ts
// modules/chat/message/message.contract.ts
import { eventIterator, oc } from "@orpc/contract";
import { z } from "zod/v4";

const messageContract = oc
  .route({ tags: ["chat", "message"] })
  .errors({ UNAUTHORIZED: {} });

const streamChannelMessages = messageContract
  .route({ method: "GET", path: "/chat/channel/{uuid}/message/stream" })
  .errors({ FORBIDDEN: { message: "You are not a member of this channel" } })
  .input(z.object({ uuid: z.uuid() }))
  .output(eventIterator(messageSchema.extend({ sender: userSchema.nullable() })));

export default { streamChannelMessages /* ... */ };
```

### Implementing contracts

Use `implement()` to create a router from a contract. TypeScript enforces that every procedure matches its contract's input/output/errors.

```ts
// modules/health/health.router.ts
import { implement } from "@orpc/server";
import healthContract from "./health.contract";

const healthRouter = implement(healthContract);

const health = healthRouter.health.handler(() => {
  return { status: "ok" };
});

export default { health };
```

A more complex router with middleware and type-safe errors:

```ts
// modules/chat/channel/channel.router.ts
import { implement } from "@orpc/server";
import { authMiddleware } from "../../../middlewares/auth-middleware";
import { userInChannelMiddleware } from "../../../middlewares/user-in-channel-middleware";
import { userIsChannelOwnerMiddleware } from "../../../middlewares/user-is-channel-owner-middleware";
import channelContract from "./channel.contract";

const channelRouter = implement(channelContract).$context<{ headers: Headers }>();

const getChannels = channelRouter.getChannels
  .use(authMiddleware)
  .handler(async ({ context }) => {
    const userChannels = await db.query.channelParticipant.findMany({
      where: eq(channelParticipant.userId, context.user.id),
      with: { channel: true },
    });
    return userChannels.map((uc) => uc.channel);
  });

const createChannel = channelRouter.createChannel
  .use(authMiddleware)
  .handler(async ({ context, input, errors }) => {
    const [ch] = await db.insert(channel).values({
      ...input,
      ownerId: context.user.id,
    }).returning();

    if (!ch) throw errors.INTERNAL_SERVER_ERROR({ message: "Failed to create" });

    await db.insert(channelParticipant).values([
      { channelUuid: ch.uuid, userId: context.user.id, role: "owner" },
      ...input.members.map((userId) => ({ channelUuid: ch.uuid, userId })),
    ]);

    return ch;
  });

// Stack middleware: auth -> membership check -> handler
const getChannel = channelRouter.getChannel
  .use(authMiddleware)
  .use(userInChannelMiddleware)
  .handler(async ({ input, errors }) => {
    const ch = await db.query.channel.findFirst({
      where: eq(channel.uuid, input.uuid),
      with: { participants: { with: { user: true } } },
    });
    if (!ch) throw errors.NOT_FOUND();
    return ch;
  });

// Stack middleware: auth -> ownership check -> handler
const deleteChannel = channelRouter.deleteChannel
  .use(authMiddleware)
  .use(userIsChannelOwnerMiddleware)
  .handler(async ({ input }) => {
    await db.delete(channel).where(eq(channel.uuid, input.uuid));
  });

export default { getChannels, createChannel, getChannel, deleteChannel };
```

### Router to contract (export safely)

```ts
import { toContract } from "@orpc/server";

const contract = toContract(router);
// Safe to export — strips handlers, keeps only types/schemas
```

## Procedures

A procedure is a function with built-in validation, middleware, and dependency injection.

```ts
import { os } from "@orpc/server";

const example = os
  .use(aMiddleware)                            // Apply middleware
  .input(z.object({ name: z.string() }))      // Validate input (Zod)
  .output(z.object({ id: z.number() }))       // Validate output (optional but recommended for perf)
  .handler(async ({ input, context }) => {     // Handler logic
    return { id: 1 };
  });
```

**Key points:**
- `.handler` is the only required step — all other chains are optional
- Specifying `.output` or explicit handler return types improves TypeScript inference speed
- Each modification creates a new builder instance (safe to reuse)
- Supports Zod, Valibot, Arktype, or any Standard Schema library
- The `type` utility works for simple cases without external libraries: `.input(type<{ value: number }>())`

### Procedure base pattern

Create reusable procedure bases with context and middleware baked in:

```ts
import { os } from "@orpc/server";

export const o = os.$context<Context>();
export const publicProcedure = o;
export const protectedProcedure = publicProcedure.use(authMiddleware);
```

## Middleware

Middleware intercepts handler execution, injects context, or guards access.

### Auth middleware

```ts
// middlewares/auth-middleware.ts
import { ORPCError, os } from "@orpc/server";

export const authMiddleware = os
  .$context<{ headers: Headers }>()
  .middleware(async ({ context, next }) => {
    const session = await auth.api.getSession({ headers: context.headers });
    if (!session) throw new ORPCError("UNAUTHORIZED");
    return next({
      context: { ...context, user: session.user },
    });
  });
```

### Input-aware middleware (authorization guards)

Middleware can receive procedure input as its second parameter — ideal for reusable resource-level guards:

```ts
// middlewares/user-in-channel-middleware.ts
export const userInChannelMiddleware = os
  .$context<{ headers: Headers; user: User }>()
  .middleware(async ({ context, next }, input: { uuid: string }) => {
    const [membership] = await db
      .select()
      .from(channelParticipant)
      .where(and(
        eq(channelParticipant.channelUuid, input.uuid),
        eq(channelParticipant.userId, context.user.id),
      ));
    if (!membership) throw new ORPCError("FORBIDDEN");
    return next();
  });

// middlewares/user-is-channel-owner-middleware.ts
export const userIsChannelOwnerMiddleware = os
  .$context<{ headers: Headers; user: User }>()
  .middleware(async ({ context, next }, input: { uuid: string }) => {
    const ch = await db.query.channel.findFirst({
      where: eq(channel.uuid, input.uuid),
    });
    if (!ch) throw new ORPCError("NOT_FOUND");
    if (ch.ownerId !== context.user.id) throw new ORPCError("FORBIDDEN");
    return next();
  });
```

**Stacking:** Middleware runs left-to-right. Each `.use()` adds a layer:

```ts
const deleteChannel = channelRouter.deleteChannel
  .use(authMiddleware)                  // 1. Validate session -> inject user
  .use(userIsChannelOwnerMiddleware)    // 2. Check ownership (reads input.uuid)
  .handler(async ({ input }) => {       // 3. Execute
    await db.delete(channel).where(eq(channel.uuid, input.uuid));
  });
```

### Other middleware features

- Context passed to `next()` is merged with existing context
- Map input for different shapes: `.use(canUpdate, input => input.id)`
- Middleware can modify output (caching): access `output` parameter to short-circuit
- Concat middleware: `aMiddleware.concat(bMiddleware)`

### Built-in middlewares

```ts
import { onError, onFinish, onStart, onSuccess } from "@orpc/server";

const proc = os
  .use(onStart(() => { /* before handler */ }))
  .use(onSuccess(() => { /* on success */ }))
  .use(onError(() => { /* on failure */ }))
  .use(onFinish(() => { /* after handler */ }))
  .handler(async () => { /* ... */ });
```

### Dedupe middleware

Avoid re-executing middleware when procedures share middleware chains:

```ts
import { dedupeMiddleware } from "@orpc/server";

const authMiddleware = os.middleware(async ({ context, next }) => {
  const session = await getSession(context.headers);
  return next({ context: { session } });
});

const dedupedAuth = dedupeMiddleware(authMiddleware);
```

## Routers (without contracts)

Routers are plain objects — no special class needed. Use this when you don't need contract-first.

```ts
export const vehicleRouter = {
  getMyVehicles: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .handler(async ({ input, context }) => { /* ... */ }),
  addVehicle: protectedProcedure
    .input(addVehicleSchema)
    .handler(async ({ input, context }) => { /* ... */ }),
};

// Compose into app router
export const appRouter = {
  vehicle: vehicleRouter,
  user: userRouter,
};
```

### Lazy routers (code splitting)

Dynamic module loading for better cold start performance:

```ts
import { lazy } from "@orpc/server";

const router = {
  health: healthRouter,
  ai: lazy(() => import("./modules/ai/ai.router")),
  chat: lazy(() => import("./modules/chat/chat.router")),
};

// For OpenAPI + lazy router, use prefix helper:
const router = {
  ai: os.prefix("/ai").lazy(() => import("./modules/ai/ai.router")),
};

// Resolve lazy routers (e.g. for contract export):
import { unlazyRouter } from "@orpc/server";
const resolvedRouter = await unlazyRouter(router);
```

## Context

Context flows from the server adapter through middleware to handlers.

```ts
export async function createContext(headers: Headers): Promise<Context> {
  const session = await auth.api.getSession({ headers });
  return { session };
}
```

**Flow:** HTTP Request -> Hono middleware -> `createContext()` -> oRPC middleware chain -> handler

The initial context is minimal (e.g. just `{ headers }`). Middleware progressively enriches it:

```
{ headers } -> authMiddleware -> { headers, user } -> handler
```

## Error Handling

### Server-side

```ts
import { ORPCError } from "@orpc/server";

throw new ORPCError("NOT_FOUND");
throw new ORPCError("BAD_REQUEST", { message: "Invalid input" });
throw new ORPCError("UNAUTHORIZED");
throw new ORPCError("FORBIDDEN", { message: "Not allowed" });
throw new ORPCError("CONFLICT", { message: "Already exists" });
throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed" });

// Non-ORPCError throws become INTERNAL_SERVER_ERROR automatically
```

### Type-safe errors (contract-defined)

When errors are defined in a contract or with `.errors()`, handlers receive a typed `errors` factory:

```ts
// Contract defines error shapes
const contract = oc
  .errors({
    RATE_LIMITED: { data: z.object({ retryAfter: z.number() }) },
    UNAUTHORIZED: {},
    NOT_FOUND: { message: "Resource not found" },
  });

// Handler uses type-safe factory
const proc = implement(contract).handler(async ({ errors }) => {
  throw errors.NOT_FOUND();
  throw errors.RATE_LIMITED({ data: { retryAfter: 60 } });
});
```

**IMPORTANT:** Never put sensitive data in `ORPCError.data` — it's sent to the client.

### Client-side

```ts
import { ORPCError, isDefinedError, safe } from "@orpc/client";

// With safe() for type-safe error handling
const [error, data, isDefined] = await safe(client.doSomething({ id: "123" }));
if (isDefinedError(error)) {
  console.log(error.data.retryAfter); // typed from contract
} else if (error) {
  // unknown error
}

// Check error codes
if (error instanceof ORPCError) {
  if (error.code === "NOT_FOUND") { /* ... */ }
}
```

## Server Handlers & Hono Integration

### Full Hono setup

```ts
// src/index.ts
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { onError } from "@orpc/server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import router from "./modules/router";

const handler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        info: { title: "My API", version: "0.0.1" },
        servers: [{ url: "/api/rpc" }],
      },
    }),
  ],
  interceptors: [onError((error) => console.error(error))],
});

const app = new Hono()
  .use(logger())
  .basePath("/api")
  .on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw))
  .use("/rpc/*", async (c, next) => {
    const { matched, response } = await handler.handle(c.req.raw, {
      prefix: "/api/rpc",
      context: { headers: c.req.raw.headers },
    });
    if (matched) return c.newResponse(response.body, response);
    await next();
  });

export default app;
```

**Key points:**
- Pass raw `c.req.raw` (Web Standards `Request`) to handler
- Initial context is `{ headers }` — middleware handles the rest
- Auth routes handled separately via `auth.handler()`
- `matched` tells you if the route was found

### RPC Handler (alternative to OpenAPI)

```ts
import { RPCHandler } from "@orpc/server/fetch";

const rpcHandler = new RPCHandler(router, {
  interceptors: [onError((error) => console.error(error))],
});
```

**Supported data types:** JSON primitives, Date, Set, Map, BigInt, RegExp, URL, undefined, NaN, Infinity, File/Blob, AsyncIteratorObject (for streaming).

### Interceptors

Interceptors run at the handler level (not middleware level). They wrap the entire request lifecycle:

```ts
const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => console.error(error)),

    // Custom interceptor — e.g. timing
    async (options) => {
      const start = Date.now();
      const result = await options.next();
      console.log(`${options.path.join(".")} took ${Date.now() - start}ms`);
      return result;
    },
  ],
});
```

**Interceptor types by scope:**
- `rootInterceptors` — before routing (raw request level)
- `interceptors` — procedure-level execution
- `clientInterceptors` — server-side client (for internal calls)

## Client Setup

### RPCLink (fetch-based)

```ts
import { RPCLink } from "@orpc/client/fetch";
import { createORPCClient } from "@orpc/client";

const link = new RPCLink({
  url: "http://localhost:3000/api/rpc",
  headers: () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

export const client = createORPCClient(link);
```

**RPCLink options:**
- `url` — server endpoint
- `headers` — function or object (runs per-request for fresh auth)
- `method` — function to choose GET/POST based on context
- `fetch` — custom fetch implementation
- `plugins` — array of link plugins (batch, dedupe, retry)

### Client context

```ts
interface ClientContext { cache?: RequestCache }

const link = new RPCLink<ClientContext>({
  url: "http://localhost:3000/rpc",
  method: ({ context }) => context?.cache ? "GET" : "POST",
  fetch: (request, init, { context }) =>
    globalThis.fetch(request, { ...init, cache: context?.cache }),
});

await client.planet.find({ id: 1 }, { context: { cache: "force-cache" } });
```

### WebSocket RPCLink

oRPC natively supports WebSocket as a transport:

```ts
// Client
import { RPCLink } from "@orpc/client/websocket";
const websocket = new WebSocket("ws://localhost:3000/ws");
const link = new RPCLink({ websocket });
export const client = createORPCClient(link);

// Server — Node.js (ws library)
import { WebSocketServer } from "ws";
import { RPCHandler } from "@orpc/server/ws";

const handler = new RPCHandler(router, {
  interceptors: [onError((e) => console.error(e))],
});

const wss = new WebSocketServer({ port: 8080 });
wss.on("connection", (ws) => {
  handler.upgrade(ws, { context: {} });
});

// Server — Standard WebSocket API (Deno, Cloudflare Workers)
import { RPCHandler } from "@orpc/server/websocket";

// Server — Bun
import { RPCHandler } from "@orpc/server/bun-ws";
```

## TanStack Query Integration

### Setup

```ts
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
export const orpc = createTanstackQueryUtils(client);
```

### Query hooks

```ts
const query = useQuery(orpc.vehicle.getUserVehicles.queryOptions({
  input: { userId },
}));

// With extra options
const query = useQuery({
  ...orpc.vehicle.getUserVehicles.queryOptions({ input: { userId } }),
  enabled: userId.length > 0,
  placeholderData: keepPreviousData,
});
```

### Infinite queries

```ts
const query = useInfiniteQuery(orpc.notification.list.infiniteOptions({
  input: (pageParam: string | undefined) => ({ cursor: pageParam, limit: 20 }),
  initialPageParam: undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
}));
```

### Mutations

```ts
const mutation = useMutation(orpc.vehicle.addVehicle.mutationOptions());

// Custom mutation with side effects
function useAddVehicle() {
  return useMutation({
    mutationFn: async (data) => {
      const photoUrl = await uploadPhoto(data.localPhotoUri);
      return client.vehicle.addVehicle({ ...data, photoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.vehicle.getMyVehicles.key() });
    },
  });
}
```

### Optimistic updates

```ts
function useMarkNotificationRead() {
  return useMutation({
    mutationFn: (id: string) => client.notification.markAsRead({ notificationId: id }),
    onMutate: async (id) => {
      const key = orpc.notification.list.key();
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueriesData({ queryKey: key });
      queryClient.setQueriesData({ queryKey: key }, (old) => {
        return { ...old, pages: old.pages.map((page) => ({ ... })) };
      });
      return { previous };
    },
    onError: (_err, _input, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orpc.notification.list.key() });
    },
  });
}
```

### Query/mutation keys

```ts
orpc.vehicle.key()                                              // All vehicle queries
orpc.vehicle.key({ type: "query" })                             // Only queries
orpc.vehicle.getUserVehicles.key({ input: { userId: "123" } })  // Specific query
orpc.vehicle.getUserVehicles.queryKey({ input: { userId: "123" } })  // Full key (for setQueryData)
const result = await orpc.vehicle.getUserVehicles.call({ userId: "123" });  // Direct call
```

### Streamed & live queries (Event Iterator)

```ts
// Streamed: data is array of events, each new event appended
const query = useQuery(orpc.live.experimental_streamedOptions({
  input: { id: 123 },
  queryFnOptions: { refetchMode: "reset", maxChunks: 3 },
  retry: true,
}));

// Live: data is always the latest event only
const query = useQuery(orpc.live.experimental_liveOptions({
  input: { id: 123 },
  retry: true,
}));
```

### Error handling in queries

```ts
import { ORPCError, isDefinedError } from "@orpc/client";

const mutation = useMutation(orpc.channel.create.mutationOptions({
  onError: (error) => {
    if (isDefinedError(error)) { /* typed error from contract */ }
  },
}));
```

## Event Iterator (SSE / Streaming)

Server-side streaming via async generators:

```ts
import { eventIterator, withEventMeta } from "@orpc/server";

const liveUpdates = os
  .output(eventIterator(z.object({ message: z.string() })))
  .handler(async function* ({ input, lastEventId, signal }) {
    if (lastEventId) {
      // Resume from lastEventId — send missed events
    }
    try {
      while (true) {
        yield withEventMeta(
          { message: "Hello!" },
          { id: "event-1", retry: 10_000 },
        );
        await new Promise((r) => setTimeout(r, 1000));
      }
    } finally {
      // Cleanup when client disconnects
    }
  });
```

**Client consumption:**

```ts
const iterator = await client.liveUpdates();
for await (const event of iterator) {
  console.log(event.message);
}

// Stop manually
const controller = new AbortController();
const iterator = await client.liveUpdates(undefined, { signal: controller.signal });
controller.abort(); // or await iterator.return()
```

### EventPublisher for pub/sub

`EventPublisher` is a typed in-memory pub/sub bus for broadcasting events between handlers.

```ts
import { EventPublisher } from "@orpc/server";

const publisher = new EventPublisher<{
  "something-updated": { id: string };
}>();

// Subscribe in a streaming handler
const live = os
  .output(eventIterator(z.object({ id: z.string() })))
  .handler(async function* ({ signal }) {
    for await (const payload of publisher.subscribe("something-updated", { signal })) {
      yield payload;
    }
  });

// Publish from a mutation handler
const update = os.handler(({ input }) => {
  publisher.publish("something-updated", { id: input.id });
});
```

**Real-world pattern — chat message streaming:**

```ts
// modules/chat/message/message.router.ts
import { EventPublisher, implement } from "@orpc/server";

// Typed publisher: channel UUID -> message payload
const publisher = new EventPublisher<
  Record<string, Message & { sender: User | null }>
>();

// Helper: save to DB + broadcast to subscribers
const saveAndPublishMessage = async ({
  channelUuid, content, sender,
}: { channelUuid: string; content: string; sender: User }) => {
  const [msg] = await db.insert(message).values({
    channelUuid, content, senderId: sender.id,
  }).returning();

  if (msg) publisher.publish(channelUuid, { ...msg, sender });
  return msg;
};

const messageRouter = implement(messageContract).$context<{ headers: Headers }>();

const sendMessageToChannel = messageRouter.sendMessageToChannel
  .use(authMiddleware)
  .use(userInChannelMiddleware)
  .handler(async ({ context, input, errors }) => {
    const msg = await saveAndPublishMessage({
      channelUuid: input.uuid,
      content: input.content,
      sender: context.user,
    });
    if (!msg) throw errors.INTERNAL_SERVER_ERROR();
    return msg;
  });

const streamChannelMessages = messageRouter.streamChannelMessages
  .use(authMiddleware)
  .use(userInChannelMiddleware)
  .handler(async function* ({ input, signal }) {
    for await (const payload of publisher.subscribe(input.uuid, { signal })) {
      yield payload;
    }
  });

export default { sendMessageToChannel, streamChannelMessages };
```

## AI SDK Integration

Use `streamToEventIterator` to bridge AI SDK streams to oRPC event iterators:

```ts
import { os, streamToEventIterator, type } from "@orpc/server";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { google } from "@ai-sdk/google";

export const chat = os
  .input(type<{ chatId: string; messages: UIMessage[] }>())
  .handler(async ({ input }) => {
    const result = streamText({
      model: google("gemini-1.5-flash"),
      system: "You are a helpful assistant.",
      messages: await convertToModelMessages(input.messages),
    });
    return streamToEventIterator(result.toUIMessageStream());
  });
```

Client-side — convert back:

```ts
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";
import { useChat } from "@ai-sdk/react";

const { messages, sendMessage } = useChat({
  transport: {
    async sendMessages(options) {
      return eventIteratorToUnproxiedDataStream(
        await client.chat({
          chatId: options.chatId,
          messages: options.messages,
        }, { signal: options.abortSignal }),
      );
    },
    reconnectToStream() { throw new Error("Unsupported"); },
  },
});
```

**Note:** Prefer `eventIteratorToUnproxiedDataStream` over `eventIteratorToStream` — AI SDK uses `structuredClone` which doesn't support proxied data.

## Plugins

### Batch Requests Plugin

Combines multiple requests into one HTTP call:

```ts
// Server
import { BatchHandlerPlugin } from "@orpc/server/plugins";
const handler = new RPCHandler(router, {
  plugins: [new BatchHandlerPlugin()],
});

// Client
import { BatchLinkPlugin } from "@orpc/client/plugins";
const link = new RPCLink({
  url: "https://api.example.com/rpc",
  plugins: [
    new BatchLinkPlugin({
      groups: [{ condition: () => true, context: {} }],
      exclude: ({ path }) => ["streaming/subscribe"].includes(path.join("/")),
    }),
  ],
});
```

**Limitations:** Does not support AsyncIteratorObject or File/Blob in responses (auto-falls back).

### Dedupe Requests Plugin

Prevents duplicate identical requests (by path + input):

```ts
import { DedupeRequestsPlugin } from "@orpc/client/plugins";
const link = new RPCLink({
  url: "https://api.example.com/rpc",
  plugins: [new DedupeRequestsPlugin()],
});
```

### Client Retry Plugin

```ts
import { ClientRetryPlugin } from "@orpc/client/plugins";
const link = new RPCLink({
  url: "https://api.example.com/rpc",
  plugins: [
    new ClientRetryPlugin({
      default: { maxRetries: 3, retryDelay: 1000 },
    }),
  ],
});

// Per-call override
await client.doSomething(input, {
  context: { retry: { maxRetries: 5, retryDelay: (attempt) => attempt * 1000 } },
});
```

## File Upload / Download

oRPC natively supports File and Blob types — no special config needed:

```ts
const uploadPhoto = os
  .input(z.object({
    file: z.instanceof(File),
    description: z.string().optional(),
  }))
  .output(z.object({ url: z.string() }))
  .handler(async ({ input }) => {
    const buffer = await input.file.arrayBuffer();
    // Upload to S3/R2...
    return { url: "https://cdn.example.com/photos/uploaded.jpg" };
  });

const downloadFile = os
  .output(z.instanceof(File))
  .handler(async () => {
    return new File([buffer], "report.pdf", { type: "application/pdf" });
  });
```

**Note:** File/Blob is NOT supported in batch responses — auto-falls back to individual requests.

## Metadata

Attach metadata to procedures for cross-cutting concerns (roles, rate limits, logging):

```ts
interface Meta { roles?: string[] }
const base = os.$meta<Meta>({});

const adminOnly = base
  .meta({ roles: ["admin"] })
  .handler(async ({ context }) => { /* ... */ });
```
