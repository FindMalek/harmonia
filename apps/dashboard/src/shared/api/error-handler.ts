import { toast } from "sonner";

export function toastError(msg: string) {
	toast.error(msg, {
		action: {
			label: "Copy",
			onClick: async () => {
				try {
					await navigator.clipboard.writeText(msg);
					toast.success("Copied");
				} catch {
					toast.error("Failed to copy");
				}
			},
		},
	});
}
