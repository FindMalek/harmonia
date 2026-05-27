import { render as reactEmailRender } from "@react-email/render";
import type { ReactElement } from "react";

export async function render(component: ReactElement) {
	return reactEmailRender(component);
}
