import { useEffect, useState } from 'react';
import { getStudyDashboard, recordStudyStep } from '../../shared/api/clients/focus';
import type { StudyStepInput } from '@pyneath/contracts';
import { ErrorMessage } from '../../shared/components/ui';
import { ProgressCharts } from './ProgressCharts';

type Dashboard = Awaited<ReturnType<typeof getStudyDashboard>>;
const labels = { completed: 'Đã hoàn thành', partial: 'Đã làm một phần', not_started: 'Chưa thực hiện' } as const;
export function StudyDashboard({ onContinue, onSession }: { onContinue: () => void; onSession: (id: string) => void }) {
  const [offset, setOffset] = useState(0);
  const [days, setDays] = useState<7 | 30>(7);
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [stepText, setStepText] = useState('');
  const [stepStatus, setStepStatus] = useState<StudyStepInput['stepStatus']>('partial');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError('');
    void getStudyDashboard(offset, days).then(value => { if (!cancelled) setData(value); })
      .catch(() => { if (!cancelled) setError('Chưa tải được tiến độ. Bạn có thể thử lại.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [offset, days, retry]);
  return <section className="dashboard-panel study-dashboard" aria-label="Tiến độ tự học">
    <div className="dashboard-panel-heading"><div><h2>Tiến độ tự học</h2><p className="field-hint">Nhìn lại các chặng và những bước do bạn tự ghi nhận.</p></div>
      <div className="button-row progress-range" role="group" aria-label="Khoảng thời gian"><button type="button" className="choice" aria-pressed={days === 7} onClick={() => { setOffset(0); setDays(7); }}>7 ngày</button><button type="button" className="choice" aria-pressed={days === 30} onClick={() => { setOffset(0); setDays(30); }}>30 ngày</button></div></div>
    <ErrorMessage message={error} retry={() => setRetry(value => value + 1)}/>
    {loading && <p role="status">Đang tải tiến độ…</p>}
    {!loading && data && <>
      {data.progress ? <ProgressCharts progress={data.progress} timezone={data.timezone}/> : <p>Chưa tải được biểu đồ tiến trình. Bạn vẫn có thể xem các ghi nhận bên dưới.</p>}
      <section className="study-dashboard-block" aria-labelledby="recent-steps-title"><h3 id="recent-steps-title">Những bước gần đây</h3>
      {data.steps.length ? <ul>{data.steps.map(step => <li key={step.sessionId}><strong>{step.stepText}</strong> · {labels[step.stepStatus]}{step.note && <p>{step.note}</p>}
        {editing === step.sessionId ? <form onSubmit={event => { event.preventDefault(); setSaving(true); setError('');
          void recordStudyStep(step.sessionId, { stepText, stepStatus, note: note.trim() || null }).then(() => { setEditing(null); setRetry(value => value + 1); })
            .catch(() => setError('Chưa lưu được ghi nhận. Nội dung bạn nhập vẫn ở đây.')).finally(() => setSaving(false)); }}>
          <label>Bước học<textarea value={stepText} maxLength={280} required onChange={event => setStepText(event.target.value)}/></label>
          <label>Kết quả<select value={stepStatus} onChange={event => setStepStatus(event.target.value as StudyStepInput['stepStatus'])}>
            {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Ghi chú<textarea value={note} maxLength={500} onChange={event => setNote(event.target.value)}/></label>
          <div className="button-row"><button className="primary" disabled={saving || !stepText.trim()}>Lưu ghi nhận</button><button className="secondary" type="button" onClick={() => setEditing(null)}>Hủy</button></div>
        </form> : <button className="text-action" onClick={() => { setEditing(step.sessionId); setStepText(step.stepText); setStepStatus(step.stepStatus); setNote(step.note ?? ''); }}>Sửa ghi nhận</button>}
      </li>)}</ul>
        : <p>Sau phiên đầu tiên, bạn có thể ghi lại điều đã làm và bước tiếp theo.</p>}
      <div className="button-row">{offset > 0 && <button className="secondary" onClick={() => setOffset(Math.max(0, offset - 10))}>Trước</button>}
        {data.hasMore && <button className="secondary" onClick={() => setOffset(offset + 10)}>Xem thêm</button>}</div>
      </section><section className="study-dashboard-block" aria-labelledby="next-step-title"><h3 id="next-step-title">Bước tiếp theo</h3>{data.openSeed ? <><p>{data.openSeed.text}</p><button className="text-action" onClick={onContinue}>Đến điểm tiếp tục</button></> : <p>Chưa có điểm tiếp tục.</p>}</section>
      {data.unrecordedSessions.length > 0 && <details><summary>Phiên chưa ghi nhận ({data.unrecordedSessions.length})</summary>
        <ul>{data.unrecordedSessions.map(session => <li key={session.id}><button className="text-action" onClick={() => onSession(session.id)}>{session.intention ?? 'Phiên tự học'} · {new Date(session.startedAt).toLocaleDateString('vi-VN', { timeZone: data.timezone })}</button></li>)}</ul>
      </details>}
    </>}
  </section>;
}
