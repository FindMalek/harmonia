import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@harmonia/env/server";

const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

type WaitlistTokenPayload = {
	email: string;
	exp: number;
};

function getSigningSecret(): string {
	return env.HARMONIA_BETTER_AUTH_SECRET;
}

function encodePayload(payload: WaitlistTokenPayload): string {
	return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string): WaitlistTokenPayload | null {
	try {
		const parsed: unknown = JSON.parse(
			Buffer.from(encoded, "base64url").toString("utf8"),
		);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"email" in parsed &&
			"exp" in parsed &&
			typeof parsed.email === "string" &&
			typeof parsed.exp === "number"
		) {
			return { email: parsed.email, exp: parsed.exp };
		}
		return null;
	} catch {
		return null;
	}
}

function signPayload(encoded: string): string {
	return createHmac("sha256", getSigningSecret())
		.update(encoded)
		.digest("base64url");
}

export function signWaitlistStatusToken(email: string): string {
	const normalizedEmail = email.toLowerCase().trim();
	const payload: WaitlistTokenPayload = {
		email: normalizedEmail,
		exp: Date.now() + TOKEN_TTL_MS,
	};
	const encoded = encodePayload(payload);
	const signature = signPayload(encoded);
	return `${encoded}.${signature}`;
}

export function verifyWaitlistStatusToken(
	token: string,
): { email: string } | null {
	const parts = token.split(".");
	if (parts.length !== 2) {
		return null;
	}

	const [encoded, signature] = parts;
	if (!encoded || !signature) {
		return null;
	}

	const expected = signPayload(encoded);
	const sigBuf = Buffer.from(signature);
	const expectedBuf = Buffer.from(expected);
	if (
		sigBuf.length !== expectedBuf.length ||
		!timingSafeEqual(sigBuf, expectedBuf)
	) {
		return null;
	}

	const payload = decodePayload(encoded);
	if (!payload || payload.exp < Date.now()) {
		return null;
	}

	return { email: payload.email.toLowerCase().trim() };
}

export function buildWaitlistStatusUrl(
	dashboardUrl: string,
	email: string,
): string {
	const base = dashboardUrl.replace(/\/$/, "");
	const token = signWaitlistStatusToken(email);
	return `${base}/waiting?token=${encodeURIComponent(token)}`;
}
