/**
 * Apply CORS headers to a Response.
 * Creates a new Response with merged headers (Response headers are immutable).
 */
export function applyCors(
	response: Response,
	corsHeaders: Record<string, string>,
): Response {
	const headers = new Headers(response.headers);
	for (const [key, value] of Object.entries(corsHeaders)) {
		headers.set(key, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

/**
 * Create a JSON response with CORS headers.
 */
export function jsonResponse(
	body: unknown,
	status: number,
	corsHeaders: Record<string, string>,
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			...corsHeaders,
		},
	});
}
