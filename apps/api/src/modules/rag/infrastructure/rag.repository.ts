import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { ChatMessage, ChatSuggestedAction, ChatThread, RagCitation, RagDocument, RagSourceType } from '@pyneath/contracts';
import { PostgresUnitOfWork } from '../../../platform/database/postgres-unit-of-work';
import type { RankedChunkCandidate } from '../domain/chunker';
import type { RagInternalSourceSnapshot, RagRepositoryPort } from '../application/rag.service';
import { chatMessages, chatThreads, ragChunks, ragDocuments } from './rag.schema';

function toDocumentDto(row: typeof ragDocuments.$inferSelect): RagDocument {
  return {
    id: row.id,
    sourceType: row.sourceType as RagSourceType,
    title: row.title,
    mimeType: row.mimeType,
    chunkCount: row.chunkCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toThreadDto(row: typeof chatThreads.$inferSelect): ChatThread {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessageDto(row: typeof chatMessages.$inferSelect): ChatMessage {
  return {
    id: row.id,
    threadId: row.threadId,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    citations: Array.isArray(row.citations) ? (row.citations as RagCitation[]) : [],
    suggestedActions: Array.isArray(row.suggestedActions) ? (row.suggestedActions as ChatSuggestedAction[]) : [],
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class DrizzleRagRepository implements RagRepositoryPort {
  constructor(private readonly transactions: PostgresUnitOfWork) {}

  async listDocuments(accountId: string): Promise<RagDocument[]> {
    const rows = await this.transactions
      .reader()
      .select()
      .from(ragDocuments)
      .where(eq(ragDocuments.accountId, accountId))
      .orderBy(desc(ragDocuments.updatedAt));
    return rows.map(toDocumentDto);
  }

  async upsertDocument(input: {
    accountId: string;
    sourceType: RagSourceType;
    sourceId: string | null;
    title: string;
    mimeType: string;
    contentHash: string;
    chunks: Array<{ content: string; embedding: number[] | null; metadata: Record<string, unknown> }>;
  }): Promise<RagDocument> {
    const db = this.transactions.reader();
    const now = new Date();
    let docRow: typeof ragDocuments.$inferSelect | undefined;

    if (input.sourceId) {
      const existing = await db
        .select()
        .from(ragDocuments)
        .where(
          and(
            eq(ragDocuments.accountId, input.accountId),
            eq(ragDocuments.sourceType, input.sourceType),
            eq(ragDocuments.sourceId, input.sourceId),
          ),
        );
      if (existing[0]) {
        if (existing[0].contentHash === input.contentHash) {
          return toDocumentDto(existing[0]);
        }
        const [updated] = await db
          .update(ragDocuments)
          .set({
            title: input.title,
            mimeType: input.mimeType,
            contentHash: input.contentHash,
            chunkCount: input.chunks.length,
            updatedAt: now,
          })
          .where(eq(ragDocuments.id, existing[0].id))
          .returning();
        docRow = updated;
        await db.delete(ragChunks).where(eq(ragChunks.documentId, existing[0].id));
      }
    }

    if (!docRow) {
      const [inserted] = await db
        .insert(ragDocuments)
        .values({
          accountId: input.accountId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          title: input.title,
          mimeType: input.mimeType,
          contentHash: input.contentHash,
          chunkCount: input.chunks.length,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      docRow = inserted;
    }

    if (input.chunks.length > 0) {
      await db.insert(ragChunks).values(
        input.chunks.map((chunk, index) => ({
          documentId: docRow!.id,
          accountId: input.accountId,
          chunkIndex: index,
          content: chunk.content,
          embedding: chunk.embedding,
          metadata: chunk.metadata,
        })),
      );
    }

    return toDocumentDto(docRow);
  }

  async removeDocument(accountId: string, id: string): Promise<boolean> {
    const rows = await this.transactions
      .reader()
      .delete(ragDocuments)
      .where(and(eq(ragDocuments.id, id), eq(ragDocuments.accountId, accountId)))
      .returning({ id: ragDocuments.id });
    return rows.length > 0;
  }

  async searchVector(accountId: string, embedding: number[], limit: number): Promise<RankedChunkCandidate[]> {
    const vectorLiteral = `[${embedding.join(',')}]`;
    const result = await this.transactions.reader().execute(sql`
      SELECT c.id AS "chunkId", c.document_id AS "documentId", d.title, d.source_type AS "sourceType", c.content
      FROM rag_chunks c
      JOIN rag_documents d ON d.id = c.document_id
      WHERE c.account_id = ${accountId}::uuid AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `);
    return (result.rows ?? []) as unknown as RankedChunkCandidate[];
  }

  async searchFts(accountId: string, query: string, limit: number): Promise<RankedChunkCandidate[]> {
    const result = await this.transactions.reader().execute(sql`
      SELECT c.id AS "chunkId", c.document_id AS "documentId", d.title, d.source_type AS "sourceType", c.content
      FROM rag_chunks c
      JOIN rag_documents d ON d.id = c.document_id
      WHERE c.account_id = ${accountId}::uuid
        AND c.tsv @@ plainto_tsquery('simple', ${query})
      ORDER BY ts_rank(c.tsv, plainto_tsquery('simple', ${query})) DESC
      LIMIT ${limit}
    `);
    return (result.rows ?? []) as unknown as RankedChunkCandidate[];
  }

  async readInternalSources(accountId: string): Promise<RagInternalSourceSnapshot[]> {
    const db = this.transactions.reader();
    const snapshots: RagInternalSourceSnapshot[] = [];

    const seedRes = await db.execute(sql`
      SELECT id, text FROM open_seeds WHERE account_id = ${accountId}::uuid LIMIT 1
    `);
    for (const row of seedRes.rows ?? []) {
      snapshots.push({
        sourceType: 'seed',
        sourceId: String(row.id),
        title: 'Open Seed hiện tại',
        content: String(row.text),
      });
    }

    const plannerRes = await db.execute(sql`
      SELECT id, title, description, scheduled_date, start_time, duration_minutes, priority, status
      FROM planner_items
      WHERE account_id = ${accountId}::uuid
      ORDER BY scheduled_date DESC
      LIMIT 40
    `);
    if ((plannerRes.rows ?? []).length > 0) {
      const lines = (plannerRes.rows ?? []).map(
        r => `- [${r.status}] ${r.scheduled_date} ${r.start_time ?? ''} (${r.duration_minutes}p, ${r.priority}): ${r.title}${r.description ? ` — ${r.description}` : ''}`,
      );
      snapshots.push({
        sourceType: 'planner',
        sourceId: 'planner-summary',
        title: 'Lịch trình Planner gần đây',
        content: lines.join('\n'),
      });
    }

    const habitRes = await db.execute(sql`
      SELECT id, title, description, frequency, target_per_week
      FROM habits
      WHERE account_id = ${accountId}::uuid AND archived = false
      LIMIT 30
    `);
    if ((habitRes.rows ?? []).length > 0) {
      const lines = (habitRes.rows ?? []).map(
        r => `- ${r.title} (${r.frequency}, mục tiêu ${r.target_per_week} ngày/tuần)${r.description ? `: ${r.description}` : ''}`,
      );
      snapshots.push({
        sourceType: 'habit',
        sourceId: 'habits-summary',
        title: 'Thói quen đang theo dõi',
        content: lines.join('\n'),
      });
    }

    const studyRes = await db.execute(sql`
      SELECT session_id, step_text, step_status, note, recorded_at
      FROM study_steps
      WHERE account_id = ${accountId}::uuid
      ORDER BY recorded_at DESC
      LIMIT 25
    `);
    if ((studyRes.rows ?? []).length > 0) {
      const lines = (studyRes.rows ?? []).map(
        r => `- [${r.step_status}] ${r.step_text}${r.note ? ` (Ghi chú: ${r.note})` : ''}`,
      );
      snapshots.push({
        sourceType: 'study_step',
        sourceId: 'study-steps-summary',
        title: 'Các bước học tập gần đây',
        content: lines.join('\n'),
      });
    }

    return snapshots;
  }

  async listThreads(accountId: string): Promise<ChatThread[]> {
    const rows = await this.transactions
      .reader()
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.accountId, accountId))
      .orderBy(desc(chatThreads.updatedAt));
    return rows.map(toThreadDto);
  }

  async createThread(accountId: string, title: string): Promise<ChatThread> {
    const [row] = await this.transactions
      .reader()
      .insert(chatThreads)
      .values({ accountId, title: title.trim() || 'Cuộc trò chuyện mới' })
      .returning();
    return toThreadDto(row);
  }

  async findThread(accountId: string, threadId: string): Promise<ChatThread | null> {
    const [row] = await this.transactions
      .reader()
      .select()
      .from(chatThreads)
      .where(and(eq(chatThreads.id, threadId), eq(chatThreads.accountId, accountId)));
    return row ? toThreadDto(row) : null;
  }

  async listMessages(accountId: string, threadId: string): Promise<ChatMessage[]> {
    const rows = await this.transactions
      .reader()
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.threadId, threadId), eq(chatMessages.accountId, accountId)))
      .orderBy(asc(chatMessages.createdAt));
    return rows.map(toMessageDto);
  }

  async appendMessage(input: {
    accountId: string;
    threadId: string;
    role: 'user' | 'assistant';
    content: string;
    citations: RagCitation[];
    suggestedActions: ChatSuggestedAction[];
  }): Promise<ChatMessage> {
    const db = this.transactions.reader();
    const [row] = await db
      .insert(chatMessages)
      .values({
        threadId: input.threadId,
        accountId: input.accountId,
        role: input.role,
        content: input.content,
        citations: input.citations,
        suggestedActions: input.suggestedActions,
      })
      .returning();
    await db
      .update(chatThreads)
      .set({ updatedAt: new Date() })
      .where(eq(chatThreads.id, input.threadId));
    return toMessageDto(row);
  }
}
