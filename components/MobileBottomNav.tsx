"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { label: 'Dash', href: '/' },
  { label: 'Txns', href: '/transactions' },
  { label: 'Stats', href: '/analysis' },
  { label: 'More', href: '/more' },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/' || pathname === '/dashboard';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-glass-nav fixed inset-x-0 bottom-0 z-40 px-3 pb-[env(safe-area-inset-bottom)] pt-2 lg:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-4 gap-2 text-xs">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`nav-link flex min-h-11 items-center justify-center rounded-[--radius] px-3 py-2 text-center text-xs ${
                active ? 'nav-link-active text-[--text-primary]' : 'text-[--text-secondary]'
              }`}
            >
              <span className="relative z-[1]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
