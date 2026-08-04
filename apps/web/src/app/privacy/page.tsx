import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { privacyMarkdown } from "@/content/privacy";

export const metadata: Metadata = {
	title: "Privacy Policy — Harmonia",
	description: "How Harmonia collects, uses, and protects your data.",
};

export default function PrivacyPage() {
	return <LegalPage markdown={privacyMarkdown} />;
}
