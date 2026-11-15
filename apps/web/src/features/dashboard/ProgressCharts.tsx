import type { getStudyDashboard } from '../../shared/api/clients/focus';

type Progress = NonNullable<Awaited<ReturnType<typeof getStudyDashboard>>['progress']>;
type Day = Progress['days'][number];

export function summarize(days: Day[]) {
  return days.reduce((total, day) => ({
    completed: total.completed + day.completed,
    partial: total.partial + day.partial,
    notStarted: total.notStarted + day.notStarted,
    soloSessions: total.soloSessions + day.soloSessions,
    campSessions: total.campSessions + day.campSessions
  }), { completed: 0, partial: 0, notStarted: 0, soloSessions: 0, campSessions: 0 });
}

const shortDate = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
const difference = (current: number, previous: number) => current === previous ? 'Bằng kỳ trước' : `${current > previous ? 'Tăng' : 'Giảm'} ${Math.abs(current - previous)} so với kỳ trước`;

export function ProgressCharts({ progress, timezone }: { progress: Progress; timezone: string }) {
  const currentDays = progress.days.slice(-progress.periodDays);
  const previousDays = progress.days.slice(-progress.periodDays * 2, -progress.periodDays);
  const current = summarize(currentDays), previous = summarize(previousDays);
  const recorded = current.completed + current.partial + current.notStarted;
  const sessions = current.soloSessions + current.campSessions;
  const previousSessions = previous.soloSessions + previous.campSessions;
  const maxDay = Math.max(1, ...currentDays.map(day => day.completed + day.partial + day.notStarted));
  const period = `${shortDate(currentDays[0]?.date ?? progress.today)}–${shortDate(progress.today)}`;
  return <div className="progress-dashboard">
    <div className="progress-summary" role="group" aria-label={`Tổng quan ${progress.periodDays} ngày`}>
      <div><span>Bước đã hoàn thành</span><strong>{current.completed}</strong><small>{difference(current.completed, previous.completed)}</small></div>
      <div><span>Bước đã ghi nhận</span><strong>{recorded}</strong><small>{difference(recorded, previous.completed + previous.partial + previous.notStarted)}</small></div>
      <div><span>Phiên Focus đã khép</span><strong>{sessions}</strong><small>{difference(sessions, previousSessions)}</small></div>
    </div>
    <p className="field-hint">{period} · So sánh với {progress.periodDays} ngày liền trước, theo múi giờ {timezone}.</p>
    <div className="progress-visuals">
      <section className="progress-panel" aria-labelledby="daily-progress-title">
        <h3 id="daily-progress-title">Các bước theo ngày</h3>
        <p className="field-hint">Mỗi cột là số bước bạn tự ghi nhận trong ngày.</p>
        {recorded ? <div className="progress-chart-scroll"><div className="progress-daily-chart" style={{ gridTemplateColumns: `repeat(${currentDays.length}, minmax(${progress.periodDays === 30 ? 18 : 24}px, 1fr))` }} aria-hidden="true">
          {currentDays.map((day, index) => { const total = day.completed + day.partial + day.notStarted;
            return <div className="progress-day" key={day.date} title={`${shortDate(day.date)}: ${day.completed} hoàn thành, ${day.partial} một phần, ${day.notStarted} chưa thực hiện`}>
              <div className="progress-day-track" style={{ height: `${Math.max(3, total / maxDay * 100)}%` }}>
                {total > 0 && <><span className="progress-completed" style={{ flex: day.completed }}/><span className="progress-partial" style={{ flex: day.partial }}/><span className="progress-not-started" style={{ flex: day.notStarted }}/></>}
              </div><small>{index % (progress.periodDays === 30 ? 7 : 1) === 0 || index === currentDays.length - 1 ? shortDate(day.date) : '\u00a0'}</small>
            </div>; })}
        </div></div> : <p>Chưa có bước nào được ghi nhận trong khoảng này.</p>}
        {progress.periodDays === 30 && recorded > 0 && <p className="field-hint">Kéo ngang biểu đồ để xem đủ 30 ngày; bảng bên dưới có toàn bộ số liệu.</p>}
        <div className="progress-legend"><span><i className="progress-completed"/>Hoàn thành</span><span><i className="progress-partial"/>Một phần</span><span><i className="progress-not-started"/>Chưa thực hiện</span></div>
        <details className="progress-data"><summary>Xem số liệu từng ngày</summary><div className="progress-table-scroll"><table><thead><tr><th>Ngày</th><th>Hoàn thành</th><th>Một phần</th><th>Chưa thực hiện</th></tr></thead><tbody>{currentDays.map(day => <tr key={day.date}><th>{shortDate(day.date)}</th><td>{day.completed}</td><td>{day.partial}</td><td>{day.notStarted}</td></tr>)}</tbody></table></div></details>
      </section>
      <section className="progress-panel" aria-labelledby="session-progress-title">
        <h3 id="session-progress-title">Phiên đã khép lại</h3>
        <p className="field-hint">Tính theo ngày bắt đầu phiên; mỗi người chỉ thấy phiên của mình.</p>
        <div className="progress-session-row"><span>Chặng riêng</span><strong>{current.soloSessions}</strong><div className="progress-meter"><span style={{ width: `${sessions ? current.soloSessions / sessions * 100 : 0}%` }}/></div></div>
        <div className="progress-session-row"><span>Cùng Camp</span><strong>{current.campSessions}</strong><div className="progress-meter"><span style={{ width: `${sessions ? current.campSessions / sessions * 100 : 0}%` }}/></div></div>
        <h4>Kết quả bước học</h4>
        <ul className="progress-status-list"><li>Hoàn thành <strong>{current.completed}</strong></li><li>Một phần <strong>{current.partial}</strong></li><li>Chưa thực hiện <strong>{current.notStarted}</strong></li></ul>
        <p className="field-hint">Bước học chỉ được ghi nhận cho phiên riêng. Một phiên có thể chưa có bước học.</p>
      </section>
    </div>
  </div>;
}
