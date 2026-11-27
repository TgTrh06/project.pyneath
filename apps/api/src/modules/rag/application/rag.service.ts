import { createHash } from 'node:crypto';
import type { ChatMessage, ChatSuggestedAction, ChatThread, CreateRagNote, RagCitation, RagDocument, RagSourceType, SendChatMessage } from '@pyneath/contracts';
import { chunkText, reciprocalRankFusion, type RankedChunkCandidate } from '../domain/chunker';
import type { ChatLlmPort, DocumentParserPort, EmbeddingProviderPort, RagAccess } from './rag.ports';

export interface RagInternalSourceSnapshot {
  sourceType: RagSourceType;
  sourceId: string;
  title: string;
  content: string;
}

export interface RagRepositoryPort {
  listDocuments(accountId: string): Promise<RagDocument[]>;
  upsertDocument(input: {
    accountId: string;
    sourceType: RagSourceType;
    sourceId: string | null;
    title: string;
    mimeType: string;
    contentHash: string;
    chunks: Array<{ content: string; embedding: number[] | null; metadata: Record<string, unknown> }>;
  }): Promise<RagDocument>;
  removeDocument(accountId: string, id: string): Promise<boolean>;
  searchVector(accountId: string, embedding: number[], limit: number): Promise<RankedChunkCandidate[]>;
  searchFts(accountId: string, query: string, limit: number): Promise<RankedChunkCandidate[]>;
  readInternalSources(accountId: string): Promise<RagInternalSourceSnapshot[]>;
  listThreads(accountId: string): Promise<ChatThread[]>;
  createThread(accountId: string, title: string): Promise<ChatThread>;
  findThread(accountId: string, threadId: string): Promise<ChatThread | null>;
  listMessages(accountId: string, threadId: string): Promise<ChatMessage[]>;
  appendMessage(input: {
    accountId: string;
    threadId: string;
    role: 'user' | 'assistant';
    content: string;
    citations: RagCitation[];
    suggestedActions: ChatSuggestedAction[];
  }): Promise<ChatMessage>;
}

export class RagNotFoundError extends Error {
  constructor(message = 'RAG resource not found') {
    super(message);
  }
}

export class RagService implements RagAccess {
  constructor(
    private readonly repository: RagRepositoryPort,
    private readonly embeddings: EmbeddingProviderPort,
    private readonly llm: ChatLlmPort,
    private readonly parser: DocumentParserPort,
  ) {}

  listDocuments(accountId: string): Promise<RagDocument[]> {
    return this.repository.listDocuments(accountId);
  }

  async ingestNote(accountId: string, input: CreateRagNote): Promise<RagDocument> {
    return this.indexTextDocument({
      accountId,
      sourceType: 'note',
      sourceId: null,
      title: input.title,
      mimeType: 'text/markdown',
      text: input.content,
    });
  }

  async ingestFile(accountId: string, filename: string, buffer: Buffer): Promise<RagDocument> {
    const parsed = await this.parser.extract(filename, buffer);
    return this.indexTextDocument({
      accountId,
      sourceType: 'file',
      sourceId: null,
      title: filename.slice(0, 200),
      mimeType: parsed.mimeType,
      text: parsed.text,
    });
  }

  async removeDocument(accountId: string, id: string): Promise<void> {
    const deleted = await this.repository.removeDocument(accountId, id);
    if (!deleted) throw new RagNotFoundError('Document not found');
  }

  async syncInternalContext(accountId: string): Promise<{ syncedDocuments: number }> {
    const sources = await this.repository.readInternalSources(accountId);
    let syncedDocuments = 0;
    for (const source of sources) {
      if (!source.content.trim()) continue;
      await this.indexTextDocument({
        accountId,
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        title: source.title,
        mimeType: 'text/plain',
        text: source.content,
      });
      syncedDocuments += 1;
    }
    return { syncedDocuments };
  }

  listThreads(accountId: string): Promise<ChatThread[]> {
    return this.repository.listThreads(accountId);
  }

  async listMessages(accountId: string, threadId: string): Promise<ChatMessage[]> {
    const thread = await this.repository.findThread(accountId, threadId);
    if (!thread) throw new RagNotFoundError('Thread not found');
    return this.repository.listMessages(accountId, threadId);
  }

  async chat(accountId: string, input: SendChatMessage) {
    let thread = input.threadId ? await this.repository.findThread(accountId, input.threadId) : null;
    if (input.threadId && !thread) throw new RagNotFoundError('Thread not found');
    if (!thread) {
      thread = await this.repository.createThread(accountId, input.message.slice(0, 80));
    }

    const history = (await this.repository.listMessages(accountId, thread.id)).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const citations = await this.retrieve(accountId, input.message, 6);
    const userMessage = await this.repository.appendMessage({
      accountId,
      threadId: thread.id,
      role: 'user',
      content: input.message,
      citations: [],
      suggestedActions: [],
    });

    const synthesis = await this.llm.synthesize({
      userMessage: input.message,
      history,
      citations,
    });

    const assistantMessage = await this.repository.appendMessage({
      accountId,
      threadId: thread.id,
      role: 'assistant',
      content: synthesis.content,
      citations,
      suggestedActions: synthesis.suggestedActions,
    });

    return { thread, userMessage, assistantMessage, citations };
  }

  async retrieve(accountId: string, query: string, limit = 6): Promise<RagCitation[]> {
    const [queryVector] = await this.embeddings.embed([query]);
    const [vectorHits, ftsHits] = await Promise.all([
      queryVector ? this.repository.searchVector(accountId, queryVector, limit * 2) : Promise.resolve([]),
      this.repository.searchFts(accountId, query, limit * 2),
    ]);

    const fused = reciprocalRankFusion(vectorHits, ftsHits).slice(0, limit);
    return fused.map(item => ({
      documentId: item.documentId,
      title: item.title,
      sourceType: item.sourceType as RagSourceType,
      excerpt: item.content.slice(0, 320),
      score: item.score,
    }));
  }

  private async indexTextDocument(input: {
    accountId: string;
    sourceType: RagSourceType;
    sourceId: string | null;
    title: string;
    mimeType: string;
    text: string;
  }): Promise<RagDocument> {
    const chunks = chunkText(input.text);
    const vectors = chunks.length > 0 ? await this.embeddings.embed(chunks) : [];
    const contentHash = createHash('sha256').update(input.text).digest('hex');

    return this.repository.upsertDocument({
      accountId: input.accountId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      title: input.title,
      mimeType: input.mimeType,
      contentHash,
      chunks: chunks.map((content, index) => ({
        content,
        embedding: vectors[index] ?? null,
        metadata: { chunkIndex: index },
      })),
    });
  }
}
