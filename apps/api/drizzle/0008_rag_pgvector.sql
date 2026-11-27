CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "rag_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "identity_accounts"("id") ON DELETE CASCADE,
  "source_type" text NOT NULL CHECK ("source_type" IN ('note', 'file', 'focus', 'study_step', 'planner', 'habit', 'seed')),
  "source_id" text,
  "title" text NOT NULL CHECK (length(trim("title")) BETWEEN 1 AND 200),
  "mime_type" text NOT NULL DEFAULT 'text/plain',
  "content_hash" text NOT NULL,
  "chunk_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "rag_documents_account_source_uq" ON "rag_documents" ("account_id", "source_type", "source_id") WHERE "source_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "rag_documents_account_idx" ON "rag_documents" ("account_id", "updated_at");
--> statement-breakpoint
CREATE TABLE "rag_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id" uuid NOT NULL REFERENCES "rag_documents"("id") ON DELETE CASCADE,
  "account_id" uuid NOT NULL REFERENCES "identity_accounts"("id") ON DELETE CASCADE,
  "chunk_index" integer NOT NULL,
  "content" text NOT NULL,
  "embedding" vector(1536),
  "tsv" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce("content", ''))) STORED,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "rag_chunks_account_doc_idx" ON "rag_chunks" ("account_id", "document_id");
--> statement-breakpoint
CREATE INDEX "rag_chunks_tsv_gin_idx" ON "rag_chunks" USING gin ("tsv");
--> statement-breakpoint
CREATE INDEX "rag_chunks_embedding_hnsw_idx" ON "rag_chunks" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
CREATE TABLE "chat_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "identity_accounts"("id") ON DELETE CASCADE,
  "title" text NOT NULL CHECK (length(trim("title")) BETWEEN 1 AND 160),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "chat_threads_account_idx" ON "chat_threads" ("account_id", "updated_at");
--> statement-breakpoint
CREATE TABLE "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "thread_id" uuid NOT NULL REFERENCES "chat_threads"("id") ON DELETE CASCADE,
  "account_id" uuid NOT NULL REFERENCES "identity_accounts"("id") ON DELETE CASCADE,
  "role" text NOT NULL CHECK ("role" IN ('user', 'assistant')),
  "content" text NOT NULL,
  "citations" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "suggested_actions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "chat_messages_thread_idx" ON "chat_messages" ("thread_id", "created_at");
