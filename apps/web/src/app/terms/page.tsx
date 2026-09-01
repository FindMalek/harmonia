import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
	title: "Terms of Service",
	description: "The terms governing your use of Sonaraem.",
};

export default function TermsPage() {
	return <LegalPage slug="terms" />;
}
