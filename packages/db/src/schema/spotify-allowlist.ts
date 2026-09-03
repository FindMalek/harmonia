import { sql } from "drizzle-orm";
import {
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { pipelineRun } from "./pipeline-run";
import { waitlistSignup } from "./waitlist-signup";

export const allowlistSlotStatusEnum = pgEnum("spotify_allowlist_slot_status", [
	"available",
	"occupied",
	"cooldown",
]);

// Only 4 rows are ever seeded — the 5th Dev Mode slot is reserved for admin access and never gets a row (#290).
export const spotifyAllowlistSlot = pgTable(
	"spotify_allowlist_slot",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		// Snapshot of the email actually added to the real dashboard for this
		// occupancy — not re-derived from user.email, which can drift after the
		// add. Lets a stuck-slot reclaim remove the exact entry it created.
		email: text("email"),
		status: allowlistSlotStatusEnum("status").notNull().default("available"),
		occupiedAt: timestamp("occupied_at"),
		releasedAt: timestamp("released_at"),
		cooldownUntil: timestamp("cooldown_until"),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("spotify_allowlist_slot_user_id_idx").on(table.userId),
		index("spotify_allowlist_slot_status_idx").on(table.status),
		uniqueIndex("spotify_allowlist_slot_one_occupied_per_user")
			.on(table.userId)
			.where(sql`${table.status} = 'occupied'`),
	],
);

export const allowlistQueuePriorityEnum = pgEnum(
	"spotify_allowlist_queue_priority",
	["manual", "cron"],
);

export const allowlistQueueStatusEnum = pgEnum(
	"spotify_allowlist_queue_status",
	["waiting", "active", "done", "failed", "cancelled"],
);

// Exactly one of userId / waitlistSignupId is set — waitlistSignupId for pre-OAuth requests, userId afterward.
export const spotifyAllowlistQueueRequest = pgTable(
	"spotify_allowlist_queue_request",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
		waitlistSignupId: integer("waitlist_signup_id").references(
			() => waitlistSignup.id,
			{ onDelete: "cascade" },
		),
		priority: allowlistQueuePriorityEnum("priority").notNull(),
		status: allowlistQueueStatusEnum("status").notNull().default("waiting"),
		slotId: integer("slot_id").references(() => spotifyAllowlistSlot.id, {
			onDelete: "set null",
		}),
		pipelineRunId: integer("pipeline_run_id").references(() => pipelineRun.id, {
			onDelete: "set null",
		}),
		// Snapshot at activation time, kept permanently (unlike the slot's own
		// email, which is cleared on release) — the historical record of which
		// email this request actually put on the dashboard.
		email: text("email"),
		requestedAt: timestamp("requested_at").defaultNow().notNull(),
		activatedAt: timestamp("activated_at"),
		completedAt: timestamp("completed_at"),
		error: text("error"),
	},
	(table) => [
		index("spotify_allowlist_queue_request_status_priority_idx").on(
			table.status,
			table.priority,
			table.requestedAt,
		),
		index("spotify_allowlist_queue_request_user_id_idx").on(table.userId),
		index("spotify_allowlist_queue_request_waitlist_signup_id_idx").on(
			table.waitlistSignupId,
		),
		uniqueIndex("spotify_allowlist_queue_request_one_live_per_user")
			.on(table.userId)
			.where(sql`${table.status} in ('waiting', 'active')`),
		uniqueIndex("spotify_allowlist_queue_request_one_live_per_waitlist_signup")
			.on(table.waitlistSignupId)
			.where(sql`${table.status} in ('waiting', 'active')`),
	],
);

export const spotifyOtpRequestStatusEnum = pgEnum(
	"spotify_otp_request_status",
	["pending", "submitted", "consumed", "expired", "failed"],
);

// code is deleted (not just marked consumed) once used — no reason to retain a spent OTP in plaintext.
export const spotifyOtpRequest = pgTable(
	"spotify_otp_request",
	{
		id: serial("id").primaryKey(),
		requestedAt: timestamp("requested_at").defaultNow().notNull(),
		code: text("code"),
		submittedAt: timestamp("submitted_at"),
		status: spotifyOtpRequestStatusEnum("status").notNull().default("pending"),
	},
	(table) => [
		index("spotify_otp_request_status_idx").on(table.status),
		index("spotify_otp_request_requested_at_idx").on(table.requestedAt),
	],
);

// Single row (id always 1) holding the encrypted Playwright session for the one automation account.
export const spotifyAllowlistSession = pgTable("spotify_allowlist_session", {
	id: integer("id").primaryKey(),
	ciphertext: text("ciphertext").notNull(),
	iv: text("iv").notNull(),
	authTag: text("auth_tag").notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});
