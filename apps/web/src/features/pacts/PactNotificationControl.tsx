import { useEffect, useState } from 'react';

const preferenceKey = 'pyneath:pact-browser-notifications';

export function browserPactNotificationsEnabled() {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return false;
  try { return localStorage.getItem(preferenceKey) === 'enabled'; } catch { return false; }
}

export function PactNotificationControl() {
  const [supported, setSupported] = useState(() => typeof window !== 'undefined' && 'Notification' in window);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported');
  const [enabled, setEnabled] = useState(browserPactNotificationsEnabled);

  useEffect(() => {
    const sync = () => {
      const available = 'Notification' in window;
      setSupported(available);
      setPermission(available ? Notification.permission : 'unsupported');
      setEnabled(browserPactNotificationsEnabled());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const toggle = async () => {
    if (enabled) {
      try { localStorage.removeItem(preferenceKey); } catch { /* Keep browser notification permission optional. */ }
      setEnabled(false);
      return;
    }
    if (!supported || permission === 'denied') return;
    try {
      const next = permission === 'granted' ? permission : await Notification.requestPermission();
      setPermission(next);
      if (next === 'granted') {
        try { localStorage.setItem(preferenceKey, 'enabled'); } catch { return; }
        setEnabled(true);
      }
    } catch { setPermission('denied'); }
  };

  return <div className="pact-notification-control">
    {supported && permission !== 'denied' ? <button type="button" className="text-action" aria-pressed={enabled} onClick={() => void toggle()}>
      {enabled ? 'Tắt thông báo trên thiết bị này' : 'Bật thông báo Pact trên thiết bị này'}
    </button> : <p className="field-hint">Thông báo trong ứng dụng vẫn hoạt động. Trình duyệt hiện không cho phép thông báo ngoài ứng dụng.</p>}
    {enabled && <p className="field-hint">Có lời mời hoặc Pact bắt đầu khi tab đang chạy nền, bạn sẽ nhận thông báo trình duyệt.</p>}
  </div>;
}
