import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
	title: "Terms of Service — Harmonia",
	description: "The terms governing your use of Harmonia.",
};

export default function TermsPage() {
	return <LegalPage slug="terms" />;
}
