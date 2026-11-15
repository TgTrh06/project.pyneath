CREATE TABLE "study_steps" (
  "session_id" uuid NOT NULL REFERENCES "focus_sessions"("id") ON DELETE CASCADE,
  "account_id" uuid NOT NULL REFERENCES "identity_accounts"("id") ON DELETE CASCADE,
  "step_text" text NOT NULL CHECK (length(trim("step_text")) BETWEEN 1 AND 280),
  "step_status" text NOT NULL CHECK ("step_status" IN ('completed', 'partial', 'not_started')),
  "note" text CHECK ("note" IS NULL OR length("note") <= 500),
  "recorded_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "study_steps_session_account_uq" ON "study_steps" ("session_id", "account_id");
--> statement-breakpoint
CREATE INDEX "study_steps_account_recorded_idx" ON "study_steps" ("account_id", "recorded_at");
