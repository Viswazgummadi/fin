"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const links = [
  ['Dashboard', '/dashboard'],
  ['Transactions', '/transactions'],
  ['Analysis', '/analysis'],
  ['Manage', '/manage'],
  ['Settings', '/settings'],
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('fin.sidebar.collapsed');
    setCollapsed(stored === 'true');
  }, []);

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('fin.sidebar.collapsed', String(next));
      return next;
    });
  };

  return (
    <aside className={`glass-nav hidden p-4 transition-all duration-300 lg:block ${collapsed ? 'w-20' : 'w-72'}`}>
      <div className="mb-6 flex items-start justify-between gap-2">
        <div className={collapsed ? 'hidden' : 'block'}>
          <div className="text-sm text-[--text-secondary]">Private money journal</div>
          <div className="bg-gradient-to-r from-[--text-primary] to-[--accent] bg-clip-text font-mono text-xl text-transparent">Calm finance</div>
        </div>
        <button onClick={toggle} className="btn-ghost px-2 py-1 text-sm">
          {collapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="space-y-2">
        {links.map(([label, href]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={label}
              href={href}
              className={`nav-link block min-h-11 rounded-[--radius] px-3 py-2 text-sm ${
                active ? 'nav-link-active text-[--text-primary]' : 'text-[--text-secondary]'
              } ${collapsed ? 'text-center' : ''}`}
              title={label}
            >
              <span className="relative z-[1]">{collapsed ? label.slice(0, 1) : label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
