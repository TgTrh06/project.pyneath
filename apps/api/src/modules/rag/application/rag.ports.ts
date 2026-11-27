import type { ChatMessage, ChatSuggestedAction, ChatThread, CreateRagNote, RagCitation, RagDocument, SendChatMessage } from '@pyneath/contracts';

export const RAG_ACCESS = Symbol('RAG_ACCESS');

export interface EmbeddingProviderPort {
  embed(texts: readonly string[]): Promise<Array<number[] | null>>;
}

export interface ChatSynthesisInput {
  userMessage: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  citations: RagCitation[];
}

export interface ChatSynthesisOutput {
  content: string;
  suggestedActions: ChatSuggestedAction[];
}

export interface ChatLlmPort {
  synthesize(input: ChatSynthesisInput): Promise<ChatSynthesisOutput>;
}

export interface DocumentParserPort {
  extract(filename: string, buffer: Buffer): Promise<{ text: string; mimeType: string }>;
}

export interface RagAccess {
  listDocuments(accountId: string): Promise<RagDocument[]>;
  ingestNote(accountId: string, input: CreateRagNote): Promise<RagDocument>;
  ingestFile(accountId: string, filename: string, buffer: Buffer): Promise<RagDocument>;
  removeDocument(accountId: string, id: string): Promise<void>;
  syncInternalContext(accountId: string): Promise<{ syncedDocuments: number }>;
  listThreads(accountId: string): Promise<ChatThread[]>;
  listMessages(accountId: string, threadId: string): Promise<ChatMessage[]>;
  chat(accountId: string, input: SendChatMessage): Promise<{ thread: ChatThread; userMessage: ChatMessage; assistantMessage: ChatMessage; citations: RagCitation[] }>;
}
