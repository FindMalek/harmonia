/**
 * Convert Headers instance to a plain object for serialization/forwarding
 */
export function headersToObject(headers: Headers): Record<string, string> {
	const obj: Record<string, string> = {};
	headers.forEach((value, key) => {
		obj[key] = value;
	});
	return obj;
}

/**
 * Convert a plain object (or Headers) back to a Headers instance
 */
export function headersToHeaders(
	headers: Headers | Record<string, string>,
): Headers {
	if (headers instanceof Headers) {
		return headers;
	}
	const h = new Headers();
	for (const [key, value] of Object.entries(headers)) {
		if (value != null && value !== "") {
			h.set(key, value);
		}
	}
	return h;
}
