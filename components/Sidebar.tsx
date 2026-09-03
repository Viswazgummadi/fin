"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NAV_ITEMS, isActiveNavPath } from '../lib/nav';

const SIDEBAR_COLLAPSED_KEY = 'fin.sidebar.collapsed';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className={`hidden shrink-0 transition-[width] duration-300 lg:block ${collapsed ? 'w-24' : 'w-72'}`}>
      <motion.aside
        layout
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="glass-nav fixed bottom-4 left-4 top-4 z-40 flex flex-col overflow-hidden p-3"
        style={{ width: collapsed ? 64 : 256 }}
      >
        <div className={`mb-5 flex shrink-0 ${collapsed ? 'justify-center' : 'items-start justify-between'} gap-2`}>
          <AnimatePresence initial={false}>
            {!collapsed ? (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <div className="text-sm text-[--text-secondary]">Private finance</div>
                <div className="bg-gradient-to-r from-[--text-primary] to-[--accent] bg-clip-text font-mono text-xl text-transparent">
                  Calm Ledger
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <button
            onClick={toggle}
            className={`btn-ghost flex h-10 w-10 shrink-0 items-center justify-center self-start px-0 py-0 text-sm ${collapsed ? 'mx-auto' : ''}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActiveNavPath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                title={item.label}
                className={`nav-link relative flex min-h-11 items-center gap-3 rounded-[--radius-md] px-3 py-2.5 text-sm ${
                  active ? 'nav-link-active' : ''
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                {active ? (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-[--radius-md]"
                    style={{
                      background: 'var(--active-pill-bg)',
                      boxShadow: 'inset 0 1px 0 var(--glass-specular), 0 10px 24px var(--glass-shade)',
                      border: '1px solid var(--active-pill-border)',
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  />
                ) : null}
                <Icon size={18} strokeWidth={2} className="relative z-[1] shrink-0" />
                <AnimatePresence initial={false}>
                  {!collapsed ? (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.16 }}
                      className="relative z-[1] overflow-hidden whitespace-nowrap font-medium"
                    >
                      {item.label}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>
      </motion.aside>
    </div>
  );
}
