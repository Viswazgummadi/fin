"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  ['Dashboard', '/dashboard'],
  ['Transactions', '/transactions'],
  ['Analysis', '/analysis'],
  ['Manage', '/manage'],
  ['Settings', '/settings'],
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 border-r border-[--border] bg-[--bg-secondary] p-4 lg:block">
      <div className="mb-6">
        <div className="text-sm text-[--text-secondary]">Private money journal</div>
        <div className="font-mono text-xl">Calm finance</div>
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
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
