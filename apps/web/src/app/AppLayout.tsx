import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { AuthSession } from "../shared/auth/auth";
import type { View } from "../shared/types/domain";
import { navigationItems } from "./router";
import { forestPlaces, type ForestPlace } from '../features/return/scene-api';
import '../shared/styles/forest-pages.css';
import { ReturnScene } from '../features/return/scene-api';
import './app-forest.css';

const navPaths: Record<string, string> = {
  home: 'M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7',
  return: 'M9 5 3 11l6 6M3 11h11a6 6 0 0 1 0 12',
  dashboard: 'M4 20V4m0 16h16M8 16v-5m4 5V7m4 9v-8',
  camps: 'm12 3-9 18h18L12 3ZM12 12l-5 9m5-9 5 9',
  pacts: 'M5 5h14v16H5zM8 2v6m8-6v6M5 11h14m-10 4h2m3 0h2',
  memory: 'M5 3h14v18l-7-4-7 4V3Z',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6',
  menu: 'M4 6h16M4 12h16M4 18h16',
};
function NavIcon({ name }: { name: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">{name === "account" ? <><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></> : <path d={navPaths[name]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>}</svg>;
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
      shellRef.current?.style.setProperty('--mobile-nav-height', `${Math.max(72, nav.getBoundingClientRect().height)}px`);
    });
    observer.observe(nav);
    return () => observer.disconnect();
  }, [view]);

  useEffect(() => {
    contentRef.current?.focus();
    setMenu(false);
    document.title = (navigationItems.find(item => item.view === view)?.label ?? "Pyneath") + " — Pyneath";
  }, [view]);

  const navItems = navigationItems.filter(item => item.view !== "settings").map(item => {
      const active = view === item.view || (item.view === "pacts" && view === "pact") || (item.view === "camps" && ["camp", "invite"].includes(view));
      return <button
        key={item.view}
        className={active ? "nav-item active" : "nav-item"}
        aria-current={active ? "page" : undefined}
        onClick={() => onNavigate(item.view)}
      ><NavIcon name={item.view}/><span>{item.label}</span></button>;
    });
  const topNav = <nav className="top-navigation" aria-label="Điều hướng ứng dụng">{navItems}</nav>;
  const accountControl = <div ref={accountRef} className="forest-account-control">
    <button ref={accountButtonRef} type="button" className="secondary forest-account-button" aria-label="Tài khoản" aria-expanded={menu} aria-controls={accountMenuId} aria-current={view === "settings" ? "page" : undefined} onClick={() => setMenu(value => !value)}><NavIcon name="account"/><span>Tài khoản</span><span className="account-chevron" aria-hidden="true"/></button>
    {menu && <div id={accountMenuId} className="forest-account-menu" aria-label="Tài khoản">
      <button type="button" className={view === "settings" ? "account-menu-item active" : "account-menu-item"} aria-current={view === "settings" ? "page" : undefined} onClick={() => { setMenu(false); onNavigate("settings"); }}><NavIcon name="settings"/><span>Cài đặt</span></button>
      <button type="button" className="account-menu-item account-menu-logout" onClick={() => { setMenu(false); onLogout(); }}><span aria-hidden="true">↪</span><span>Đăng xuất</span></button>
    </div>}
  </div>;

  if (view === "camp") return <div className="camp-immersive-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); contentRef.current?.focus(); }}>Đến nội dung Camp</a>
    <header className="site-header app-topbar camp-topbar"><div className="site-header-inner">
      <button className="brand" onClick={() => onNavigate("return")} aria-label="Pyneath, về điểm tiếp tục"><svg width="28" height="32" viewBox="0 0 32 36" fill="none" aria-hidden="true"><path d="M16 31V5M16 5 8 15h5L5 25h22l-8-10h5L16 5Z" stroke="currentColor" strokeWidth="2"/></svg><span>Pyneath.</span></button>
      {topNav}<div className="header-actions">{accountControl}</div>
    </div></header>
    <div className="camp-context-bar"><button type="button" className="camp-back" onClick={() => onNavigate("camps")}><span aria-hidden="true">←</span> Các Camp của bạn</button></div>
    <main id="main-content" ref={contentRef} tabIndex={-1}>{children}</main>
  </div>;

  const isReturn = ["return", "login", "register"].includes(view);
  const scenePlace = (isReturn ? "return" : view === "dashboard" ? "memory" : view) as ForestPlace;
  const shell = (controls: ReactNode) => <div ref={shellRef} className={`site-shell forest-shell forest-app forest-place-${view}${isReturn ? ' forest-shell-return' : ' forest-page-shell'}`}>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); contentRef.current?.focus(); }}>Đến nội dung chính</a>
    <header className="site-header">
      <div className="site-header-inner">
        <button className="brand" onClick={() => onNavigate("return")} aria-label="Pyneath, về điểm tiếp tục">
          <svg width="28" height="32" viewBox="0 0 32 36" fill="none" aria-hidden="true"><path d="M16 31V5M16 5 8 15h5L5 25h22l-8-10h5L16 5Z" stroke="currentColor" strokeWidth="2"/></svg>
          <span>Pyneath.</span>
        </button>
        {topNav}
        <div className="header-actions">
          {controls}
          {accountControl}
        </div>
      </div>
    </header>
    <div className="main-layout">
      <div className="app-main-column">
        <main className="content" id="main-content" ref={contentRef} tabIndex={-1}><div className={isReturn ? undefined : "forest-page-content"}>{children}</div></main>
        <footer>{!isReturn && <img src={`/marten/3d/${forestPlaces[scenePlace]?.pose ?? "sit"}.webp`} alt="" width="72" height="56"/>}<span>{forestPlaces[scenePlace]?.label ?? "Dưới tán thông"}</span></footer>
      </div>
    </div>
    <nav ref={bottomNavRef} className="forest-bottom-nav" aria-label="Điều hướng nhanh">
      {navigationItems.filter(item => ["return", "dashboard", "camps", "pacts", "memory"].includes(item.view)).map(item => {
        const active = view === item.view || (item.view === "pacts" && view === "pact") || (item.view === "camps" && ["camp", "invite"].includes(view));
        return <button type="button" key={item.view} aria-label={item.view === "dashboard" ? "Dashboard thống kê" : undefined} aria-current={active ? "page" : undefined} onClick={() => onNavigate(item.view)}><NavIcon name={item.view}/><span>{item.view === "dashboard" ? "Thống kê" : item.label}</span></button>;
      })}
    </nav>
  </div>;
  return <ReturnScene place={scenePlace}>{shell}</ReturnScene>;
}
