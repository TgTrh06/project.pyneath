import { MartenMascot } from '../../shared/components/marten/MartenMascot';

export function AuthLoading() {
  return (
    <main className="site-shell forest-shell forest-auth">
      <div className="forest-auth-loading" role="status">
        <MartenMascot size="md" pose="rest" />
        <p>Đang mở khoảng riêng của bạn…</p>
      </div>
    </main>
  );
}
