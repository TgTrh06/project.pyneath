import { StudyDashboard } from './StudyDashboard';
import './dashboard.css';

export function DashboardView({ onContinue, onSession }: { onContinue: () => void; onSession: (id: string) => void }) {
  return <div className="dashboard-page">
    <div className="workspace-heading"><div className="page-intro"><p className="eyebrow">DASHBOARD</p><h1>Nhìn rõ những chặng đã qua.</h1><p>Các bước và phiên của riêng bạn, theo nhịp của bạn.</p></div>
      <button type="button" className="primary" onClick={onContinue}>Quay lại học</button></div>
    <StudyDashboard onContinue={onContinue} onSession={onSession}/>
  </div>;
}
