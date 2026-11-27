import type { ChatMessage, ChatThread, CreateRagNote, RagCitation, RagDocument, SendChatMessage } from '@pyneath/contracts';
import { getCsrfToken } from '../../auth/auth';
import { apiUrl } from '../config';
import { ApiRequestError, mutation, request } from '../transport';

export const listRagDocuments = () =>
  request<{ documents: RagDocument[] }>('/me/rag/documents');

export const createRagNote = (input: CreateRagNote) =>
  mutation<{ document: RagDocument }>('/me/rag/notes', 'POST', input);

export const deleteRagDocument = (id: string) =>
  mutation<void>(`/me/rag/documents/${id}`, 'DELETE');

export const syncRagInternal = () =>
  mutation<{ syncedDocuments: number }>('/me/rag/sync', 'POST');

export const listChatThreads = () =>
  request<{ threads: ChatThread[] }>('/me/rag/threads');

export const listChatMessages = (threadId: string) =>
  request<{ messages: ChatMessage[] }>(`/me/rag/threads/${threadId}/messages`);

export const sendChatMessage = (input: SendChatMessage) =>
  mutation<{ thread: ChatThread; userMessage: ChatMessage; assistantMessage: ChatMessage; citations: RagCitation[] }>(
    '/me/rag/chat',
    'POST',
    input,
  );

export async function uploadRagFile(file: File): Promise<{ document: RagDocument }> {
  const csrf = await getCsrfToken();
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${apiUrl}/me/rag/files`, {
    method: 'POST',
    credentials: 'include',
    headers: csrf ? { 'X-XSRF-TOKEN': csrf } : undefined,
    body: form,
  });
  const payload = (await response.json()) as { document?: RagDocument; message?: string; code?: string };
  if (!response.ok || !payload.document) {
    throw new ApiRequestError(payload.message ?? 'Không thể tải tệp lên.', response.status, payload.code);
  }
  return { document: payload.document };
}
