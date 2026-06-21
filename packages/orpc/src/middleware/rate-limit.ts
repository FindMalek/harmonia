import { ORPCError } from "@orpc/server";

import { o } from "../os";
import { rateLimiters } from "../utils/rate-limiter";

/**
 * Picks strict (unauthenticated) vs standard (authenticated) automatically —
 * context.session is populated for every request regardless of procedure type.
 */
export const rateLimitMiddleware = o.middleware(async ({ context, next }) => {
	const isAuthenticated = !!context.session?.user;
	const limiter = isAuthenticated ? rateLimiters.standard : rateLimiters.strict;
	const identifier = limiter.getIdentifier(
		context.headers,
		context.session?.user?.id,
	);

	const result = limiter.check(identifier);
	if (!result.success) {
		throw new ORPCError("TOO_MANY_REQUESTS", {
			message: `Rate limit exceeded. Please try again in ${result.retryAfter}s.`,
		});
	}

	return next();
});
