CREATE TABLE "planner_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "identity_accounts"("id") ON DELETE CASCADE,
  "title" text NOT NULL CHECK (length(trim("title")) BETWEEN 1 AND 160),
  "description" text CHECK ("description" IS NULL OR length("description") <= 1000),
  "scheduled_date" text NOT NULL CHECK ("scheduled_date" ~ '^\d{4}-\d{2}-\d{2}$'),
  "start_time" text CHECK ("start_time" IS NULL OR "start_time" ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  "duration_minutes" integer NOT NULL DEFAULT 25 CHECK ("duration_minutes" BETWEEN 5 AND 480),
  "priority" text NOT NULL DEFAULT 'medium' CHECK ("priority" IN ('low', 'medium', 'high')),
  "status" text NOT NULL DEFAULT 'todo' CHECK ("status" IN ('todo', 'in_progress', 'done')),
  "linked_session_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "planner_items_account_date_idx" ON "planner_items" ("account_id", "scheduled_date");
--> statement-breakpoint
CREATE TABLE "habits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "identity_accounts"("id") ON DELETE CASCADE,
  "title" text NOT NULL CHECK (length(trim("title")) BETWEEN 1 AND 120),
  "description" text CHECK ("description" IS NULL OR length("description") <= 400),
  "frequency" text NOT NULL DEFAULT 'daily' CHECK ("frequency" IN ('daily', 'weekly')),
  "target_per_week" integer NOT NULL DEFAULT 7 CHECK ("target_per_week" BETWEEN 1 AND 7),
  "reminder_time" text CHECK ("reminder_time" IS NULL OR "reminder_time" ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  "archived" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "habits_account_idx" ON "habits" ("account_id", "archived");
--> statement-breakpoint
CREATE TABLE "habit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "habit_id" uuid NOT NULL REFERENCES "habits"("id") ON DELETE CASCADE,
  "account_id" uuid NOT NULL REFERENCES "identity_accounts"("id") ON DELETE CASCADE,
  "log_date" text NOT NULL CHECK ("log_date" ~ '^\d{4}-\d{2}-\d{2}$'),
  "completed" boolean NOT NULL DEFAULT true,
  "note" text CHECK ("note" IS NULL OR length("note") <= 300),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "habit_logs_habit_date_uq" ON "habit_logs" ("habit_id", "log_date");
--> statement-breakpoint
CREATE INDEX "habit_logs_account_date_idx" ON "habit_logs" ("account_id", "log_date");
