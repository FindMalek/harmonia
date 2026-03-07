export function getErrorMessage(error: unknown): string | undefined {
	if (error instanceof Error) return error.message;
	if (error != null) return String(error);
	return undefined;
}

export function safeErrorPayload(error: unknown): {
	message: string;
	stack?: string;
	causeMessage?: string;
	code?: string;
} {
	const err = error instanceof Error ? error : new Error(String(error));
	const cause =
		err.cause ??
		(error &&
			typeof error === "object" &&
			"cause" in error &&
			(error as { cause?: unknown }).cause);
	const causeMessage =
		cause instanceof Error
			? cause.message
			: cause != null
				? String(cause)
				: undefined;
	const code =
		error && typeof error === "object" && "code" in error
			? (error as { code?: string }).code
			: undefined;
	return {
		message: err.message,
		stack: err.stack,
		...(causeMessage !== undefined && { causeMessage }),
		...(code !== undefined && { code }),
	};
}
