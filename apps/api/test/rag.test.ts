import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chunkText, reciprocalRankFusion } from '../src/modules/rag/domain/chunker';
import { extractDocumentText, UnsupportedRagFileError } from '../src/modules/rag/infrastructure/document-parser';
import { RagService } from '../src/modules/rag/application/rag.service';

test('chunkText splits long text with overlap and preserves short text', () => {
  assert.deepEqual(chunkText('   '), []);
  assert.deepEqual(chunkText('Short note'), ['Short note']);

  const long = Array.from({ length: 40 }, (_, i) => `Sentence ${i} about focus planning and study steps.`).join(' ');
  const chunks = chunkText(long, 300, 50);
  assert.ok(chunks.length > 3);
  assert.ok(chunks.every(c => c.length <= 300));
});

test('reciprocalRankFusion prioritizes chunks appearing in both vector and FTS results', () => {
  const a = { chunkId: 'a', documentId: 'd1', title: 'Doc A', sourceType: 'note', content: 'alpha' };
  const b = { chunkId: 'b', documentId: 'd2', title: 'Doc B', sourceType: 'file', content: 'beta' };
  const c = { chunkId: 'c', documentId: 'd3', title: 'Doc C', sourceType: 'planner', content: 'gamma' };

  const fused = reciprocalRankFusion([a, b], [b, c]);
  assert.equal(fused[0].chunkId, 'b');
  assert.equal(fused.length, 3);
});

test('extractDocumentText validates formats and extracts md/txt safely', async () => {
  await assert.rejects(() => extractDocumentText('empty.txt', Buffer.alloc(0)), UnsupportedRagFileError);
  await assert.rejects(() => extractDocumentText('evil.exe', Buffer.from('123')), UnsupportedRagFileError);

  const md = await extractDocumentText('notes.md', Buffer.from('# Plan\n- Step 1', 'utf8'));
  assert.equal(md.mimeType, 'text/markdown');
  assert.match(md.text, /# Plan/);
});

test('RagService indexes notes, syncs internal context, and produces formatted chat replies', async () => {
  const docs: Array<{ id: string; title: string }> = [];
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  const service = new RagService(
    {
      listDocuments: async () => [],
      upsertDocument: async input => {
        const doc = {
          id: '00000000-0000-4000-8000-000000000101',
          sourceType: input.sourceType,
          title: input.title,
          mimeType: input.mimeType,
          chunkCount: input.chunks.length,
          createdAt: '2026-11-27T00:00:00.000Z',
          updatedAt: '2026-11-27T00:00:00.000Z',
        };
        docs.push({ id: doc.id, title: doc.title });
        return doc;
      },
      removeDocument: async () => true,
      searchVector: async () => [],
      searchFts: async () => [
        { chunkId: 'c1', documentId: '00000000-0000-4000-8000-000000000101', title: 'Lịch trình Planner', sourceType: 'planner', content: 'Ôn thi hệ điều hành chương 3' },
      ],
      readInternalSources: async () => [
        { sourceType: 'planner', sourceId: 'planner-summary', title: 'Lịch trình Planner', content: 'Ôn thi hệ điều hành chương 3' },
      ],
      listThreads: async () => [],
      createThread: async (_acc, title) => ({
        id: '00000000-0000-4000-8000-000000000201',
        title,
        createdAt: '2026-11-27T00:00:00.000Z',
        updatedAt: '2026-11-27T00:00:00.000Z',
      }),
      findThread: async () => null,
      listMessages: async () => [],
      appendMessage: async input => {
        messages.push({ role: input.role, content: input.content });
        return {
          id: '00000000-0000-4000-8000-000000000301',
          threadId: input.threadId,
          role: input.role,
          content: input.content,
          citations: input.citations,
          suggestedActions: input.suggestedActions,
          createdAt: '2026-11-27T00:00:00.000Z',
        };
      },
    },
    { embed: async texts => texts.map(() => null) },
    {
      synthesize: async input => ({
        content: `### Phân tích\nĐã tham chiếu ${input.citations.length} nguồn.`,
        suggestedActions: [{ kind: 'start_focus', title: 'Ôn chương 3', durationMinutes: 25 }],
      }),
    },
    { extract: async (filename, buffer) => ({ text: buffer.toString('utf8'), mimeType: filename.endsWith('.md') ? 'text/markdown' : 'text/plain' }) },
  );

  const synced = await service.syncInternalContext('owner');
  assert.equal(synced.syncedDocuments, 1);

  const reply = await service.chat('owner', { message: 'Mình bị kẹt ở chương 3 hệ điều hành' });
  assert.equal(reply.citations.length, 1);
  assert.match(reply.assistantMessage.content, /### Phân tích/);
  assert.equal(reply.assistantMessage.suggestedActions[0]?.kind, 'start_focus');
  assert.equal(messages.length, 2);
});
