import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { HabitFrequency, HabitWithStats } from '@pyneath/contracts';
import { createHabit, deleteHabit, listHabits, toggleHabitLog } from '../../shared/api/clients/habits';
import { ErrorMessage } from '../../shared/components/ui';
import { MartenMascot } from '../../shared/components/marten/MartenMascot';
import './habits.css';

const todayKey = () => new Date().toISOString().slice(0, 10);

export function HabitsView() {
  const today = todayKey();
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [targetPerWeek, setTargetPerWeek] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listHabits(today);
      setHabits(res.habits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa tải được danh sách thói quen.');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const { habit } = await createHabit(
        {
          title: title.trim(),
          description: description.trim() || null,
          frequency,
          targetPerWeek,
        },
        today,
      );
      setHabits(prev => [...prev, habit]);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo thói quen mới.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleToday(habit: HabitWithStats) {
    setBusy(true);
    setError('');
    try {
      await toggleHabitLog(habit.id, { logDate: today, completed: !habit.completedToday });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật check-in.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      await deleteHabit(id);
      setHabits(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa thói quen.');
    } finally {
      setBusy(false);
    }
  }

  const completedTodayCount = habits.filter(h => h.completedToday).length;

  return (
    <section className="habits-page" aria-labelledby="habits-heading">
      <div>
        <p className="eyebrow">DUY TRÌ NHỊP ĐỘ</p>
        <h1 id="habits-heading">Habit Tracker</h1>
        <p className="field-hint">
          Theo dõi thói quen hằng ngày/tuần · Hôm nay: {completedTodayCount}/{habits.length} đã hoàn thành.
        </p>
      </div>

      <ErrorMessage message={error} retry={load} />

      <div className="habits-grid">
        <div className="habits-card">
          <h2>Thêm thói quen</h2>
          <form className="habits-form" onSubmit={handleCreate}>
            <label>
              Tên thói quen
              <input
                required
                maxLength={120}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ví dụ: Đọc 10 trang sách mỗi tối"
              />
            </label>
            <label>
              Mô tả ngắn (tùy chọn)
              <textarea
                rows={2}
                maxLength={400}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Điều kiện hoặc thời điểm thực hiện..."
              />
            </label>
            <label>
              Tần suất
              <select
                value={frequency}
                onChange={e => {
                  const next = e.target.value as HabitFrequency;
                  setFrequency(next);
                  setTargetPerWeek(next === 'daily' ? 7 : 3);
                }}
              >
                <option value="daily">Hằng ngày</option>
                <option value="weekly">Theo tuần</option>
              </select>
            </label>
            <label>
              Mục tiêu (ngày/tuần)
              <input
                type="number"
                min={1}
                max={7}
                value={targetPerWeek}
                onChange={e => setTargetPerWeek(Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
              />
            </label>
            <button type="submit" className="primary" disabled={busy || !title.trim()}>
              {busy ? 'Đang lưu…' : 'Tạo thói quen'}
            </button>
          </form>
        </div>

        <div className="habits-card">
          <h2>Danh sách thói quen ({today})</h2>
          {loading ? (
            <p role="status">Đang tải thói quen…</p>
          ) : habits.length === 0 ? (
            <div className="planner-empty">
              <MartenMascot size="sm" pose="happy" />
              <div>
                <strong>Chưa có thói quen nào được theo dõi.</strong>
                <p className="field-hint" style={{ margin: '4px 0 0' }}>
                  Bắt đầu với 1–2 thói quen nhỏ để giữ nhịp ổn định.
                </p>
              </div>
            </div>
          ) : (
            <ul className="habits-list">
              {habits.map(habit => (
                <li key={habit.id} className="habit-row">
                  <div className="habit-row__info">
                    <strong>{habit.title}</strong>
                    {habit.description && <span className="field-hint">{habit.description}</span>}
                    <div className="habit-row__meta">
                      <span className="habit-streak-pill">Chuỗi hiện tại: {habit.currentStreak} ngày</span>
                      <span className="habit-streak-pill">Kỷ lục: {habit.bestStreak} ngày</span>
                      <span>Mục tiêu: {habit.targetPerWeek} ngày/tuần</span>
                    </div>
                  </div>
                  <div className="habit-row__actions">
                    <button
                      type="button"
                      className={habit.completedToday ? 'secondary' : 'primary'}
                      aria-pressed={habit.completedToday}
                      disabled={busy}
                      onClick={() => void handleToggleToday(habit)}
                    >
                      {habit.completedToday ? '✓ Đã hoàn thành' : 'Check-in hôm nay'}
                    </button>
                    <button type="button" className="text-action" disabled={busy} onClick={() => void handleDelete(habit.id)}>
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
