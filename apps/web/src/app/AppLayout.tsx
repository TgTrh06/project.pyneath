import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { AuthSession } from "../shared/auth/auth";
import type { View } from "../shared/types/domain";
import { navigationItems } from "./router";
import { ThemeSelect } from "../shared/theme/ThemeSelect";
import { MartenMascot } from "../shared/components/marten/MartenMascot";
import "../shared/styles/forest-pages.css";
import "./app-forest.css";

const navPaths: Record<string, string> = {
  home: "M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7",
  return: "M9 5 3 11l6 6M3 11h11a6 6 0 0 1 0 12",
  assistant: "M4 6h16v10H8l-4 4V6Zm5 4h6m-6 3h4",
  planner: "M5 5h14v16H5zM8 2v6m8-6v6M5 10h14M9 14h2m4 0h2m-8 4h2m4 0h2",
  habits: "M9 11l3 3L20 6M4 12a8 8 0 1 0 16 0",
  dashboard: "M4 20V4m0 16h16M8 16v-5m4 5V7m4 9v-8",
  camps: "m12 3-9 18h18L12 3ZM12 12l-5 9m5-9 5 9",
  pacts: "M5 5h14v16H5zM8 2v6m8-6v6M5 11h14m-10 4h2m3 0h2",
  memory: "M5 3h14v18l-7-4-7 4V3Z",
  settings: "M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6",
  menu: "M4 6h16M4 12h16M4 18h16",
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {name === "account" ? (
        <>
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </>
      ) : (
        <path d={navPaths[name] ?? navPaths.menu} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function AppLayout({ view, onNavigate, onLogout, children }: {
  view: View;
  onNavigate: (view: View | string) => void;
  session: AuthSession | null;
  onLogout: () => void;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const bottomNavRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountMenuId = useId();
  const [menu, setMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!menu) return;
    const closeOutside = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setMenu(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenu(false);
      requestAnimationFrame(() => accountButtonRef.current?.focus());
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  useEffect(() => {
    const nav = bottomNavRef.current;
    if (!nav) return;
    const observer = new ResizeObserver(() => {
      shellRef.current?.style.setProperty("--mobile-nav-height", `${Math.max(72, nav.getBoundingClientRect().height)}px`);
    });
    observer.observe(nav);
    return () => observer.disconnect();
  }, [view]);

  useEffect(() => {
    contentRef.current?.focus();
    setMenu(false);
    setSidebarOpen(false);
    document.title = (navigationItems.find(item => item.view === view)?.label ?? "Pyneath") + " — Pyneath";
  }, [view]);

  const navItems = navigationItems
    .filter(item => item.view !== "settings")
    .map(item => {
      const active =
        view === item.view ||
        (item.view === "pacts" && view === "pact") ||
        (item.view === "camps" && ["camp", "invite"].includes(view));
      return (
        <button
          key={item.view}
          type="button"
          className={active ? "nav-item active" : "nav-item"}
          aria-current={active ? "page" : undefined}
          onClick={() => onNavigate(item.view)}
        >
          <NavIcon name={item.view} />
          <span>{item.label}</span>
        </button>
      );
    });

  const accountControl = (
    <div ref={accountRef} className="forest-account-control">
      <button
        ref={accountButtonRef}
        type="button"
        className="secondary forest-account-button"
        aria-label="Tài khoản"
        aria-expanded={menu}
        aria-controls={accountMenuId}
        aria-current={view === "settings" ? "page" : undefined}
        onClick={() => setMenu(value => !value)}
      >
        <NavIcon name="account" />
        <span>Tài khoản</span>
        <span className="account-chevron" aria-hidden="true" />
      </button>
      {menu && (
        <div id={accountMenuId} className="forest-account-menu" aria-label="Tài khoản">
          <button
            type="button"
            className={view === "settings" ? "account-menu-item active" : "account-menu-item"}
            aria-current={view === "settings" ? "page" : undefined}
            onClick={() => {
              setMenu(false);
              onNavigate("settings");
            }}
          >
            <NavIcon name="settings" />
            <span>Cài đặt</span>
          </button>
          <button
            type="button"
            className="account-menu-item account-menu-logout"
            onClick={() => {
              setMenu(false);
              onLogout();
            }}
          >
            <span aria-hidden="true">↪</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </div>
  );

  const isReturn = ["return", "login", "register"].includes(view);

  return (
    <div
      ref={shellRef}
      className={`site-shell forest-shell forest-app pm-shell forest-place-${view}${isReturn ? " forest-shell-return" : " forest-page-shell"}`}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={event => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
      >
        Đến nội dung chính
      </a>

      <header className="site-header app-topbar">
        <div className="site-header-inner pm-topbar-inner">
          <div className="pm-topbar-left">
            <button
              type="button"
              className="secondary pm-sidebar-toggle"
              aria-label={sidebarOpen ? "Đóng thanh chức năng" : "Mở thanh chức năng"}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(open => !open)}
            >
              <NavIcon name="menu" />
            </button>
            <button className="brand" onClick={() => onNavigate("return")} aria-label="Pyneath, về điểm tiếp tục">
              <svg width="26" height="30" viewBox="0 0 32 36" fill="none" aria-hidden="true">
                <path d="M16 31V5M16 5 8 15h5L5 25h22l-8-10h5L16 5Z" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>Pyneath.</span>
            </button>
          </div>
          <div className="header-actions pm-system-actions">
            <ThemeSelect />
            {accountControl}
          </div>
        </div>
      </header>

      <div className="pm-shell-body">
        {sidebarOpen && <div className="pm-sidebar-backdrop" aria-hidden="true" onClick={() => setSidebarOpen(false)} />}
        <aside className={`pm-sidebar${sidebarOpen ? " is-open" : ""}`} aria-label="Chức năng ứng dụng">
          <div className="pm-sidebar-mascot">
            <MartenMascot size="sm" pose="idle" />
            <div>
              <strong>Marten</strong>
              <span>Không gian làm việc</span>
            </div>
          </div>
          <nav className="pm-sidebar-nav" aria-label="Điều hướng chức năng">
            {navItems}
          </nav>
          <div className="pm-sidebar-footer">
            <p className="field-hint">Một bước nhỏ mỗi lần.</p>
          </div>
        </aside>

        <div className="app-main-column pm-main-column">
          {view === "camp" && (
            <div className="camp-context-bar">
              <button type="button" className="camp-back" onClick={() => onNavigate("camps")}>
                <span aria-hidden="true">←</span> Các Camp của bạn
              </button>
            </div>
          )}
          <main className="content" id="main-content" ref={contentRef} tabIndex={-1}>
            <div className={`pm-inner-surface ${isReturn ? "pm-return-content" : "forest-page-content"}`}>{children}</div>
          </main>
        </div>
      </div>

      <nav ref={bottomNavRef} className="forest-bottom-nav" aria-label="Điều hướng nhanh">
        {navigationItems
          .filter(item => ["return", "dashboard", "camps", "pacts", "memory"].includes(item.view))
          .map(item => {
            const active =
              view === item.view ||
              (item.view === "pacts" && view === "pact") ||
              (item.view === "camps" && ["camp", "invite"].includes(view));
            return (
              <button
                type="button"
                key={item.view}
                aria-label={item.view === "dashboard" ? "Dashboard thống kê" : undefined}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(item.view)}
              >
                <NavIcon name={item.view} />
                <span>{item.view === "dashboard" ? "Thống kê" : item.label}</span>
              </button>
            );
          })}
      </nav>
    </div>
  );
}
