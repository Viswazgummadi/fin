"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const links = [
  ['Dashboard', '/dashboard'],
  ['Transactions', '/transactions'],
  ['Add', '/add'],
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
    <aside className={`hidden border-r border-[--border] bg-[--bg-secondary] p-4 transition-all lg:block ${collapsed ? 'w-20' : 'w-72'}`}>
      <div className="mb-6 flex items-start justify-between gap-2">
        <div className={collapsed ? 'hidden' : 'block'}>
          <div className="text-sm text-[--text-secondary]">Private money journal</div>
          <div className="font-mono text-xl">Calm finance</div>
        </div>
        <button onClick={toggle} className="rounded-[--radius] border border-[--border] px-2 py-1 text-sm text-[--text-secondary] hover:text-[--text-primary]">
          {collapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="space-y-1">
        {links.map(([label, href]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={label}
              href={href}
              className={`block min-h-11 rounded-[--radius] px-3 py-2 text-sm transition ${
                active ? 'bg-[--bg-tertiary] text-[--text-primary]' : 'text-[--text-secondary] hover:bg-[--bg-tertiary] hover:text-[--text-primary]'
              } ${collapsed ? 'text-center' : ''}`}
              title={label}
            >
              {collapsed ? label.slice(0, 1) : label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
