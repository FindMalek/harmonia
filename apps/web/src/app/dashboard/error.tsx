"use client";

import { ErrorState } from "@/components/error-state";

export default function DashboardError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="p-4">
			<ErrorState message={error.message} onRetry={reset} />
		</div>
	);
}
