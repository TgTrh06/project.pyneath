import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { ChatMessage, ChatSuggestedAction, ChatThread, RagDocument } from '@pyneath/contracts';
import {
  createRagNote,
  deleteRagDocument,
  listChatMessages,
  listChatThreads,
  listRagDocuments,
  sendChatMessage,
  syncRagInternal,
  uploadRagFile,
} from '../../shared/api/clients/rag';
import { createPlannerItem } from '../../shared/api/clients/planner';
import { startSolo } from '../../shared/api/clients/focus';
import { newRequestKey } from '../../shared/api/requestKey';
import { ErrorMessage } from '../../shared/components/ui';
import { MartenMascot } from '../../shared/components/marten/MartenMascot';
import { MarkdownRenderer } from './MarkdownRenderer';
import './assistant-chat.css';

const todayKey = () => new Date().toISOString().slice(0, 10);

export function AssistantChatView({
  onSession,
  onNavigate,
  onNotice,
}: {
  onSession: (id: string) => void;
  onNavigate: (view: string) => void;
  onNotice: (text: string) => void;
}) {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [sending, setSending] = useState(false);
  const [busyDoc, setBusyDoc] = useState(false);
  const [error, setError] = useState('');

  const loadWorkspace = useCallback(async () => {
    setError('');
    try {
      const [docsRes, threadsRes] = await Promise.all([listRagDocuments(), listChatThreads()]);
      setDocuments(docsRes.documents);
      setThreads(threadsRes.threads);
      if (threadsRes.threads[0] && !activeThreadId) {
        const firstId = threadsRes.threads[0].id;
        setActiveThreadId(firstId);
        const msgRes = await listChatMessages(firstId);
        setMessages(msgRes.messages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa tải được dữ liệu Trợ lý AI.');
    }
  }, [activeThreadId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  async function selectThread(threadId: string) {
    setActiveThreadId(threadId);
    try {
      const res = await listChatMessages(threadId);
      setMessages(res.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được lịch sử hội thoại.');
    }
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    setError('');
    try {
      const res = await sendChatMessage({ threadId: activeThreadId, message: text });
      setActiveThreadId(res.thread.id);
      setThreads(prev => [res.thread, ...prev.filter(t => t.id !== res.thread.id)]);
      setMessages(prev => [...prev, res.userMessage, res.assistantMessage]);
    } catch (err) {
      setInput(text);
      setError(err instanceof Error ? err.message : 'Chưa thể phân tích câu hỏi lúc này.');
    } finally {
      setSending(false);
    }
  }

  async function handleSyncInternal() {
    setBusyDoc(true);
    setError('');
    try {
      const res = await syncRagInternal();
      const docs = await listRagDocuments();
      setDocuments(docs.documents);
      onNotice(`Đã đồng bộ ${res.syncedDocuments} nguồn dữ liệu Pyneath vào kho RAG.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đồng bộ dữ liệu nội bộ thất bại.');
    } finally {
      setBusyDoc(false);
    }
  }

  async function handleAddNote(event: FormEvent) {
    event.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim() || busyDoc) return;
    setBusyDoc(true);
    setError('');
    try {
      const { document } = await createRagNote({ title: noteTitle.trim(), content: noteContent.trim() });
      setDocuments(prev => [document, ...prev]);
      setNoteTitle('');
      setNoteContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu ghi chú ngữ cảnh.');
    } finally {
      setBusyDoc(false);
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusyDoc(true);
    setError('');
    try {
      const { document } = await uploadRagFile(file);
      setDocuments(prev => [document, ...prev]);
      onNotice(`Đã phân tích và lưu "${document.title}" (${document.chunkCount} đoạn).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đọc tệp tải lên.');
    } finally {
      setBusyDoc(false);
    }
  }

  async function handleDeleteDoc(id: string) {
    setBusyDoc(true);
    try {
      await deleteRagDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa tài liệu.');
    } finally {
      setBusyDoc(false);
    }
  }

  async function handleAction(action: ChatSuggestedAction) {
    try {
      if (action.kind === 'add_to_planner') {
        await createPlannerItem({
          title: action.title,
          scheduledDate: todayKey(),
          durationMinutes: action.durationMinutes ?? 25,
          priority: 'medium',
        });
        onNotice(`Đã thêm "${action.title}" vào Planner hôm nay.`);
        onNavigate('planner');
      } else {
        const mins = action.durationMinutes && action.durationMinutes <= 10 ? 10 : 25;
        const { session } = await startSolo({ intention: action.title, durationMinutes: mins }, newRequestKey());
        onSession(session.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thực hiện hành động gợi ý.');
    }
  }

  return (
    <section className="assistant-page" aria-labelledby="assistant-heading">
      <div>
        <p className="eyebrow">RAG ANALYTICAL ASSISTANT</p>
        <h1 id="assistant-heading">Trợ lý phân tích Marten</h1>
        <p className="field-hint">
          Truy xuất dữ liệu Planner, Habits, Focus và tài liệu bạn tải lên (PDF, DOCX, DOC, MD, TXT) để tháo gỡ điểm nghẽn.
        </p>
      </div>

      <ErrorMessage message={error} retry={loadWorkspace} />

      <div className="assistant-layout">
        <div className="assistant-card">
          <div className="assistant-chat-header">
            <div className="assistant-chat-brand">
              <MartenMascot size="sm" pose={sending ? 'thinking' : 'idle'} />
              <div>
                <strong>Marten Analyst</strong>
                <p className="field-hint" style={{ margin: 0 }}>
                  {sending ? 'Đang truy xuất RAG & phân tích…' : 'Sẵn sàng phân tích công việc của bạn'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {threads.length > 0 && (
                <select
                  aria-label="Chọn hội thoại"
                  value={activeThreadId ?? ''}
                  onChange={e => e.target.value && void selectThread(e.target.value)}
                >
                  {threads.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setActiveThreadId(undefined);
                  setMessages([]);
                }}
              >
                + Luồng mới
              </button>
            </div>
          </div>

          <div className="assistant-messages">
            {messages.length === 0 ? (
              <div className="planner-empty">
                <MartenMascot size="md" pose="happy" />
                <div>
                  <strong>Hãy kể cho Marten biết bạn đang vướng mắc ở đâu.</strong>
                  <p className="field-hint" style={{ margin: '4px 0 0' }}>
                    Ví dụ: "Mình bị quá tải môn Hệ điều hành tuần này, hãy xem lịch Planner & tài liệu để chia nhỏ giúp mình."
                  </p>
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <article key={msg.id} className={`chat-bubble chat-bubble--${msg.role}`}>
                  <span className="chat-bubble__role">{msg.role === 'user' ? 'Bạn' : 'Marten'}</span>
                  {msg.role === 'assistant' ? (
                    <MarkdownRenderer content={msg.content} />
                  ) : (
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  )}
                  {msg.citations.length > 0 && (
                    <div className="chat-citations" aria-label="Nguồn ngữ cảnh đã dùng">
                      {msg.citations.map((c, idx) => (
                        <span key={`${c.documentId}-${idx}`} className="chat-citation-pill">
                          [{idx + 1}] {c.title}
                        </span>
                      ))}
                    </div>
                  )}
                  {msg.suggestedActions.length > 0 && (
                    <div className="chat-actions">
                      {msg.suggestedActions.map((act, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={act.kind === 'start_focus' ? 'primary' : 'secondary'}
                          onClick={() => void handleAction(act)}
                        >
                          {act.kind === 'add_to_planner' ? `+ Planner: ${act.title}` : `▶ Focus: ${act.title}`}
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>

          <form className="assistant-composer" onSubmit={handleSend}>
            <textarea
              rows={3}
              maxLength={4000}
              value={input}
              disabled={sending}
              onChange={e => setInput(e.target.value)}
              placeholder="Mô tả công việc bạn đang vướng mắc hoặc yêu cầu lập kế hoạch..."
            />
            <div className="assistant-composer-bar">
              <span className="field-hint">{input.length}/4000</span>
              <button type="submit" className="primary" disabled={sending || !input.trim()}>
                {sending ? 'Đang phân tích…' : 'Gửi phân tích'}
              </button>
            </div>
          </form>
        </div>

        <aside className="assistant-card" aria-label="Kho ngữ cảnh RAG">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <h2 style={{ margin: 0 }}>Kho ngữ cảnh RAG</h2>
            <button type="button" className="secondary" disabled={busyDoc} onClick={() => void handleSyncInternal()}>
              Đồng bộ Pyneath
            </button>
          </div>
          <p className="field-hint" style={{ margin: 0 }}>
            Tải lên tài liệu (<code>.pdf</code>, <code>.docx</code>, <code>.doc</code>, <code>.md</code>, <code>.txt</code>, tối đa 5MB) hoặc thêm ghi chú nhanh.
          </p>

          <label className="secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: 'var(--radius-control)', cursor: 'pointer' }}>
            <span>{busyDoc ? 'Đang xử lý tệp…' : '↑ Tải tệp tài liệu lên'}</span>
            <input
              type="file"
              accept=".pdf,.txt,.md,.doc,.docx"
              disabled={busyDoc}
              onChange={e => void handleFileUpload(e)}
              style={{ display: 'none' }}
            />
          </label>

          <form onSubmit={handleAddNote} style={{ display: 'grid', gap: '8px' }}>
            <input
              maxLength={160}
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
              placeholder="Tiêu đề ghi chú ngữ cảnh..."
            />
            <textarea
              rows={3}
              maxLength={50000}
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder="Dán nội dung bài tập, đề bài hoặc ghi chú..."
            />
            <button type="submit" className="secondary" disabled={busyDoc || !noteTitle.trim() || !noteContent.trim()}>
              Lưu ghi chú vào RAG
            </button>
          </form>

          <h3 style={{ margin: '4px 0 0', fontSize: '.9rem' }}>Tài liệu đã lập chỉ mục ({documents.length})</h3>
          <ul className="rag-doc-list">
            {documents.map(doc => (
              <li key={doc.id} className="rag-doc-item">
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.title}
                  </strong>
                  <span className="field-hint">{doc.sourceType} · {doc.chunkCount} đoạn</span>
                </div>
                <button type="button" className="text-action" disabled={busyDoc} onClick={() => void handleDeleteDoc(doc.id)}>
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
