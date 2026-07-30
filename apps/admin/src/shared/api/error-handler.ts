import { toast } from "sonner";

export function toastError(error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	const fullText = `Error: ${message}`;
	toast.error(fullText, {
		action: {
			label: "Copy",
			onClick: () => {
				navigator.clipboard.writeText(fullText).catch(() => null);
			},
		},
	});
}
