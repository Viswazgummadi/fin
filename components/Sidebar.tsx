"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'fin.sidebar.collapsed';

const links = [
  ['Dashboard', '/'],
  ['Transactions', '/transactions'],
  ['Analysis', '/analysis'],
  ['Manage', '/manage'],
  ['Settings', '/settings'],
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/' || pathname === '/dashboard';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return initialCollapsed;
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === 'true' || stored === 'false') return stored === 'true';
    return initialCollapsed;
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === 'true' || stored === 'false') {
      setCollapsed(stored === 'true');
      return;
    }

    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(initialCollapsed));
    document.cookie = `fin.sidebar.collapsed=${String(initialCollapsed)}; path=/; max-age=31536000; samesite=lax`;
  }, [initialCollapsed]);

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      document.cookie = `fin.sidebar.collapsed=${String(next)}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  };

  return (
    <div className={`hidden shrink-0 transition-all duration-300 lg:block ${collapsed ? 'w-24' : 'w-72'}`}>
      <aside className={`glass-nav fixed bottom-4 left-4 top-4 z-40 overflow-y-auto p-3 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className={`mb-5 flex ${collapsed ? 'justify-center' : 'items-start justify-between'} gap-2`}>
          <div className={collapsed ? 'hidden' : 'block'}>
            <div className="text-sm text-[--text-secondary]">Private money journal</div>
            <div className="bg-gradient-to-r from-[--text-primary] to-[--accent] bg-clip-text font-mono text-xl text-transparent">Calm finance</div>
          </div>
          <button onClick={toggle} className={`btn-ghost flex h-10 w-10 items-center justify-center self-start px-0 py-0 text-sm ${collapsed ? 'mx-auto' : ''}`}>
            {collapsed ? '→' : '←'}
          </button>
        </div>
        <nav className="space-y-2">
          {links.map(([label, href]) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`nav-link min-h-11 rounded-[--radius] px-3 py-2 text-sm ${
                  active ? 'nav-link-active text-[--text-primary]' : 'text-[--text-secondary]'
                } ${collapsed ? 'flex items-center justify-center px-0 text-center' : 'block'}`}
                title={label}
              >
                <span className={`relative z-[1] ${collapsed ? 'inline-flex h-5 w-5 items-center justify-center text-center font-medium leading-none' : ''}`}>{collapsed ? label.slice(0, 1) : label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
