/**
 * db-ops migration: backfill-account-issuer
 * file: 20260902052255-backfill-account-issuer.ts
 * created: 2026-09-02T05:22:55.419Z
 *
 * WHAT
 *   Backfills account.issuer (added nullable in #350) on every pre-existing
 *   row. Without this, better-auth 1.7 can't find any account created before
 *   the column existed — it looks accounts up by (issuer, accountId), and a
 *   NULL issuer never matches the value it computes at request time. That
 *   breaks both Spotify sign-in/re-auth (error=account_not_linked) and the
 *   admin email/password login, for every existing user, not just new ones.
 *
 *   Value written matches better-auth's own internal derivation exactly
 *   (verified against the installed better-auth@1.7.2 source — see
 *   createLocalAccountIssuer/createOAuthAccountIssuer in
 *   @better-auth/core's db/schema/account.mjs, and every call site that
 *   reads issuer back: oauth2/account-key.mjs, oauth2/link-account.mjs,
 *   api/routes/{sign-up,sign-in,password}.mjs, plugins/admin/routes.mjs):
 *     - providerId "credential" (email/password, incl. the admin account)
 *         -> "local:credential"
 *     - any other providerId (OAuth, e.g. "spotify")
 *         -> "local:oauth:" + encodeURIComponent(providerId)
 *   This repo only ever writes those two providerId values (see
 *   packages/auth/src/index.ts), but the encode step keeps this correct if
 *   a provider id ever contains characters requiring escaping.
 *
 *   Part of #349. Deliberately data-only: the follow-up NOT NULL + unique
 *   (issuer, accountId) index is a separate Drizzle migration once this is
 *   confirmed clean in prod (see the collision check this migration logs).
 *
 * PREREQUISITES
 *   - account.issuer column must exist (Drizzle migration 0036, already merged)
 *
 * RUN (set SONARAEM_DATABASE_URL in .env to the database you want)
 *
 *   Test without writes:
 *     pnpm db:ops:migrate -- --dry-run --only backfill-account-issuer
 *
 *   Apply for real (local dev):
 *     pnpm db:ops:migrate -- --only backfill-account-issuer
 *
 *   Prod: merge PR — CI runs pnpm db:ops:migrate (no --dry-run)
 *
 * OTHER
 *   pnpm db:ops:status
 *   pnpm db:reset   (truncates sonaraem_db_ops locally)
 *
 * AUTHOR RULES
 *   - Handle dryRun in up() — reads OK, no writes when dryRun is true
 *   - Idempotent: safe if retried after a crash before the ledger marks completed
 *   - No DDL here — CREATE/ALTER/DROP belongs in Drizzle schema migrations
 *   - Never edit this file after it is completed in prod — checksum mismatch fails CI
 *
 * ESCAPE HATCH (prod, rare)
 *   UPDATE sonaraem_db_ops SET status = 'failed' WHERE name = '20260902052255-backfill-account-issuer';
 *   then re-run the Database migrations workflow
 */

import { account } from "@sonaraem/db/schema/auth";
import { and, eq, isNull, sql } from "drizzle-orm";

import type { DbOpsContext } from "../types";

/**
 * Mirrors better-auth 1.7's own issuer derivation exactly — see the file
 * header for every call site this was cross-checked against.
 */
function computeIssuer(providerId: string): string {
	return providerId === "credential"
		? "local:credential"
		: `local:oauth:${encodeURIComponent(providerId)}`;
}

export async function up({ db, log, dryRun }: DbOpsContext): Promise<void> {
	log.info({ dryRun }, "backfill-account-issuer: starting");

	const pendingProviderIds = await db
		.selectDistinct({ providerId: account.providerId })
		.from(account)
		.where(isNull(account.issuer));

	let examined = 0;
	let updated = 0;

	for (const { providerId } of pendingProviderIds) {
		const issuer = computeIssuer(providerId);
		const matchesGroup = and(
			eq(account.providerId, providerId),
			isNull(account.issuer),
		);

		const [countRow] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(account)
			.where(matchesGroup);
		const count = countRow?.count ?? 0;

		examined += count;

		if (dryRun) {
			log.info(
				{ providerId, issuer, wouldUpdate: count },
				"backfill-account-issuer: dry-run group",
			);
			continue;
		}

		await db.update(account).set({ issuer }).where(matchesGroup);
		updated += count;
		log.info(
			{ providerId, issuer, updated: count },
			"backfill-account-issuer: updated group",
		);
	}

	if (dryRun) {
		log.info(
			{ examined, wouldUpdate: examined, skipped: 0 },
			"backfill-account-issuer: dry-run done",
		);
		return;
	}

	// better-auth's unique index is (issuer, accountId) — verify the backfill
	// didn't create a collision before the follow-up Drizzle migration adds
	// that constraint for real.
	const collisions = await db
		.select({
			issuer: account.issuer,
			accountId: account.accountId,
			count: sql<number>`count(*)::int`,
		})
		.from(account)
		.groupBy(account.issuer, account.accountId)
		.having(sql`count(*) > 1`);

	if (collisions.length > 0) {
		log.error(
			{ collisions },
			"backfill-account-issuer: found (issuer, accountId) collisions after backfill — resolve before adding the unique index",
		);
	}

	log.info(
		{ examined, updated, collisions: collisions.length },
		"backfill-account-issuer: done",
	);
}
