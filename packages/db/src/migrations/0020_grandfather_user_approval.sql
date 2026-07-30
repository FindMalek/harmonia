-- Grandfather existing users before waitlist approval gate went live.
UPDATE "user" SET is_approved = true WHERE is_approved = false;
