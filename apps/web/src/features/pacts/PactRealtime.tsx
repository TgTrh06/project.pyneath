import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { pactChangedEventSchema, realtimeEvents, type PactChangedEvent } from '@pyneath/contracts';
import { getPact, listPacts } from '../../shared/api/clients/pacts';
import { joinSession } from '../../shared/api/clients/focus';
import { realtimeUrl } from '../../shared/api/config';
import { ApiRequestError } from '../../shared/api/transport';
import { browserPactNotificationsEnabled } from './PactNotificationControl';
import { sessionToAutoJoin } from './pactRealtimeState';
import './pact-realtime.css';

type Notice = { id: string; text: string; pactId: string; action: 'open' | 'retry' };

export function PactRealtime({ accountId, onOpenPact, onOpenSession }: { accountId: string; onOpenPact: (id: string) => void; onOpenSession: (id: string) => void }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const callbacks = useRef({ onOpenPact, onOpenSession });
  callbacks.current = { onOpenPact, onOpenSession };
  const handled = useRef(new Set<string>());
  const attempted = useRef(new Set<string>());
  const notifiedInvites = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    let recovering = false;
    const socket = io(`${realtimeUrl ?? ''}/realtime`, { withCredentials: true, transports: ['websocket'] });
    const addNotice = (id: string, text: string, pactId: string, action: Notice['action'] = 'open') => {
      if (!active) return;
      setNotices(current => [{ id, text, pactId, action }, ...current.filter(item => item.id !== id)].slice(0, 3));
    };
    const browserNotice = (event: PactChangedEvent, body: string) => {
      if (document.visibilityState === 'visible' || !browserPactNotificationsEnabled()) return;
      try {
        const notification = new Notification(event.change === 'invited' ? 'Bạn có lời mời Focus Pact' : 'Focus Pact đã bắt đầu', { body, tag: `pact:${event.pactId}:${event.change}` });
        notification.onclick = () => {
          window.focus();
          notification.close();
          callbacks.current.onOpenPact(event.pactId);
        };
      } catch { /* In-app status remains available when browser notifications are blocked. */ }
    };
    const start = async (pactId: string, expectedSessionId?: string) => {
      const key = `${pactId}:${expectedSessionId ?? 'active'}`;
      if (attempted.current.has(key)) return;
      attempted.current.add(key);
      try {
        const { pact } = await getPact(pactId);
        const sessionId = sessionToAutoJoin(pact, accountId, expectedSessionId);
        if (!active || !sessionId) return;
        const result = await joinSession(sessionId);
        if (!active) return;
        handled.current.add(key);
        window.dispatchEvent(new Event('pyneath:pact-changed'));
        callbacks.current.onOpenSession(result.session.id);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Chưa thể vào phiên cùng Camp.';
        addNotice(`start:${key}`, `${message} Pact vẫn mở để bạn thử tham gia lại.`, pactId, 'retry');
        const retryable = !(error instanceof ApiRequestError) || !error.status || error.status >= 500;
        if (retryable) attempted.current.delete(key);
        else handled.current.add(key);
      }
    };
    const recover = async () => {
      if (!active || recovering || document.visibilityState !== 'visible') return;
      recovering = true;
      try {
        const [pending, activePacts] = await Promise.all([listPacts('pending'), listPacts('active')]);
        if (!active) return;
        for (const item of pending.items) {
          if (item.response !== 'invited' || notifiedInvites.current.has(item.id)) continue;
          notifiedInvites.current.add(item.id);
          addNotice(`invite:${item.id}`, 'Bạn có một lời mời Focus Pact đang chờ phản hồi.', item.id);
        }
        for (const item of activePacts.items) {
          if (!item.isCreator && item.response === 'accepted' && item.sessionId) void start(item.id, item.sessionId);
        }
      } catch { /* Reconnect or the visible-state fallback will try again. */ }
      finally { recovering = false; }
    };
    const handle = async (raw: unknown) => {
      const parsed = pactChangedEventSchema.safeParse(raw);
      if (!parsed.success || !active) return;
      const event = parsed.data;
      const key = `${event.pactId}:${event.change}:${event.change === 'started' ? event.sessionId : ''}`;
      if (handled.current.has(key)) return;
      handled.current.add(key);
      window.dispatchEvent(new Event('pyneath:pact-changed'));
      if (event.change === 'started') {
        browserNotice(event, 'Nhấn để mở Pact và vào phiên cùng mọi người.');
        void start(event.pactId, event.sessionId);
        return;
      }
      try {
        const { pact } = await getPact(event.pactId);
        if (!active) return;
        if (event.change === 'invited' && pact.participants.find(person => person.accountId === accountId)?.response === 'invited') {
          notifiedInvites.current.add(pact.id);
          addNotice(key, 'Bạn có lời mời Focus Pact trong Camp.', pact.id);
          browserNotice(event, 'Mở Pyneath để xem và phản hồi lời mời.');
        } else if (event.change === 'response_changed' && pact.creatorId === accountId) {
          const latest = pact.participants.filter(person => person.accountId !== accountId).map(person => person.response);
          const accepted = pact.participants.filter(person => person.accountId !== accountId && person.response === 'accepted').length;
          const declined = pact.participants.filter(person => person.accountId !== accountId && person.response === 'declined').length;
          addNotice(key, `Cập nhật phản hồi: ${accepted} người đã nhận lời${declined ? `, ${declined} người không tham gia` : ''}${latest.length ? '.' : ''}`, pact.id);
        } else if (event.change === 'cancelled') {
          addNotice(key, 'Cuộc hẹn Camp này đã được hủy.', pact.id);
        }
      } catch { /* The API remains the authority; inaccessible or expired Pacts are ignored. */ }
    };
    socket.on('connect', () => void recover());
    socket.on(realtimeEvents.pactChanged, handle);
    socket.on('connect_error', () => undefined);
    const visible = () => { if (document.visibilityState === 'visible') void recover(); };
    const retryJoin = (event: Event) => {
      const pactId = (event as CustomEvent<{ pactId?: string }>).detail?.pactId;
      if (pactId) {
        for (const key of attempted.current) if (key.startsWith(`${pactId}:`)) attempted.current.delete(key);
        void start(pactId);
      }
    };
    window.addEventListener('online', visible);
    window.addEventListener('focus', visible);
    window.addEventListener('pyneath:pact-join', retryJoin);
    document.addEventListener('visibilitychange', visible);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible' && !socket.connected) socket.connect(); }, 10000);
    void recover();
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('online', visible);
      window.removeEventListener('focus', visible);
      window.removeEventListener('pyneath:pact-join', retryJoin);
      document.removeEventListener('visibilitychange', visible);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [accountId]);

  const close = (id: string) => setNotices(current => current.filter(item => item.id !== id));
  return notices.length ? <aside className="pact-live-notices" aria-label="Thông báo Pact" aria-live="polite">{notices.map(item => <div className="pact-live-notice" key={item.id} role="status">
    <p>{item.text}</p><div className="button-row"><button className="secondary" onClick={() => { close(item.id); item.action === 'retry' ? window.dispatchEvent(new CustomEvent('pyneath:pact-join', { detail: { pactId: item.pactId } })) : callbacks.current.onOpenPact(item.pactId); }}>{item.action === 'retry' ? 'Thử vào Pact' : 'Mở Pact'}</button><button className="text-action" onClick={() => close(item.id)}>Đóng</button></div>
  </div>)}</aside> : null;
}
