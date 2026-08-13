"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { label: 'Dash', href: '/dashboard' },
  { label: 'Add', href: '/add' },
  { label: 'Txns', href: '/transactions' },
  { label: 'More', href: '/more' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-secondary/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-4 gap-2 text-xs">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-center ${
                active ? 'border-accent bg-accent/10 text-text-primary' : 'border-border text-text-secondary'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
