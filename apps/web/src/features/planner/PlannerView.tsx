import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { PlannerItem, PlannerPriority, PlannerStatus } from '@pyneath/contracts';
import { createPlannerItem, deletePlannerItem, listPlannerItems, updatePlannerItem } from '../../shared/api/clients/planner';
import { startSolo } from '../../shared/api/clients/focus';
import { newRequestKey } from '../../shared/api/requestKey';
import { ErrorMessage } from '../../shared/components/ui';
import { MartenMascot } from '../../shared/components/marten/MartenMascot';
import './planner.css';

const todayKey = () => new Date().toISOString().slice(0, 10);

const priorityLabel: Record<PlannerPriority, string> = {
  low: 'Thấp',
  medium: 'Vừa',
  high: 'Ưu tiên cao',
};

const statusLabel: Record<PlannerStatus, string> = {
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  done: 'Hoàn thành',
};

function focusDurationFor(minutes: number): 5 | 10 | 25 | 50 {
  if (minutes <= 7) return 5;
  if (minutes <= 17) return 10;
  if (minutes <= 37) return 25;
  return 50;
}

export function PlannerView({ onSession, onNotice }: { onSession: (id: string) => void; onNotice: (text: string) => void }) {
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [priority, setPriority] = useState<PlannerPriority>('medium');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listPlannerItems(selectedDate, selectedDate);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa tải được lịch trình.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalMinutes = useMemo(
    () => items.reduce((sum, item) => sum + item.durationMinutes, 0),
    [items],
  );
  const doneCount = useMemo(
    () => items.filter(item => item.status === 'done').length,
    [items],
  );

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const { item } = await createPlannerItem({
        title: title.trim(),
        description: description.trim() || null,
        scheduledDate: selectedDate,
        startTime: startTime || null,
        durationMinutes,
        priority,
      });
      setItems(prev => [...prev, item]);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo đầu việc.');
    } finally {
      setBusy(false);
    }
  }

  async function handleStatus(item: PlannerItem, status: PlannerStatus) {
    setBusy(true);
    try {
      const { item: updated } = await updatePlannerItem(item.id, { status });
      setItems(prev => prev.map(row => (row.id === item.id ? updated : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      await deletePlannerItem(id);
      setItems(prev => prev.filter(row => row.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa đầu việc.');
    } finally {
      setBusy(false);
    }
  }

  async function handleStartFocus(item: PlannerItem) {
    setBusy(true);
    setError('');
    try {
      const { session } = await startSolo(
        { intention: item.title, durationMinutes: focusDurationFor(item.durationMinutes) },
        newRequestKey(),
      );
      await updatePlannerItem(item.id, { status: 'in_progress', linkedSessionId: session.id });
      onNotice(`Đã mở phiên Focus cho "${item.title}".`);
      onSession(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể bắt đầu phiên Focus từ đầu việc này.');
      setBusy(false);
    }
  }

  return (
    <section className="planner-page" aria-labelledby="planner-heading">
      <div className="planner-header">
        <div>
          <p className="eyebrow">QUẢN LÝ THỜI GIAN</p>
          <h1 id="planner-heading">Planner</h1>
          <p className="field-hint">Sắp xếp time-block theo ngày và bắt đầu phiên tập trung ngay khi sẵn sàng.</p>
        </div>
        <label>
          Ngày xem
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </label>
      </div>

      <ErrorMessage message={error} retry={load} />

      <div className="planner-grid">
        <div className="planner-card">
          <h2>Thêm đầu việc mới</h2>
          <form className="planner-form" onSubmit={handleCreate}>
            <label>
              Tên việc
              <input
                required
                maxLength={160}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ví dụ: Đọc 15 trang tài liệu kiến trúc"
              />
            </label>
            <label>
              Ghi chú (tùy chọn)
              <textarea
                rows={3}
                maxLength={1000}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Mục tiêu cụ thể hoặc tài liệu cần mở..."
              />
            </label>
            <div className="planner-form-row">
              <label>
                Giờ bắt đầu
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </label>
              <label>
                Thời lượng (phút)
                <input
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value) || 25)}
                />
              </label>
            </div>
            <label>
              Mức ưu tiên
              <select value={priority} onChange={e => setPriority(e.target.value as PlannerPriority)}>
                <option value="low">Thấp</option>
                <option value="medium">Vừa</option>
                <option value="high">Ưu tiên cao</option>
              </select>
            </label>
            <button type="submit" className="primary" disabled={busy || !title.trim()}>
              {busy ? 'Đang lưu…' : 'Thêm vào lịch'}
            </button>
          </form>
        </div>

        <div className="planner-card">
          <div className="planner-toolbar">
            <h2 style={{ margin: 0 }}>Lịch ngày {selectedDate}</h2>
            <span className="field-hint">
              {doneCount}/{items.length} hoàn thành · Tổng {totalMinutes} phút
            </span>
          </div>

          {loading ? (
            <p role="status">Đang tải lịch trình…</p>
          ) : items.length === 0 ? (
            <div className="planner-empty">
              <MartenMascot size="sm" pose="idle" />
              <div>
                <strong>Chưa có đầu việc nào cho ngày {selectedDate}.</strong>
                <p className="field-hint" style={{ margin: '4px 0 0' }}>
                  Thêm một việc nhỏ bên trái để phân bổ thời gian hợp lý.
                </p>
              </div>
            </div>
          ) : (
            <ul className="planner-list">
              {items.map(item => (
                <li key={item.id} className="planner-item" data-status={item.status}>
                  <div className="planner-item__top">
                    <span className="planner-item__title">{item.title}</span>
                    <div className="planner-badges">
                      {item.startTime && <span className="planner-badge">{item.startTime}</span>}
                      <span className="planner-badge">{item.durationMinutes} phút</span>
                      <span className={`planner-badge planner-badge--${item.priority}`}>
                        {priorityLabel[item.priority]}
                      </span>
                      <span className="planner-badge">{statusLabel[item.status]}</span>
                    </div>
                  </div>
                  {item.description && <p className="field-hint" style={{ margin: 0 }}>{item.description}</p>}
                  <div className="planner-item__actions">
                    {item.status !== 'done' && (
                      <button type="button" className="primary" disabled={busy} onClick={() => void handleStartFocus(item)}>
                        Bắt đầu Focus
                      </button>
                    )}
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => void handleStatus(item, item.status === 'done' ? 'todo' : 'done')}
                    >
                      {item.status === 'done' ? 'Mở lại' : 'Đánh dấu xong'}
                    </button>
                    <button type="button" className="text-action" disabled={busy} onClick={() => void handleDelete(item.id)}>
                      Xóa
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
