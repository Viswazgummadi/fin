"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NAV_ITEMS, isActiveNavPath } from '../lib/nav';
import { APP_NAME } from '../lib/brand';
import { useAutoHideNav } from '../lib/useAutoHideNav';

const SIDEBAR_COLLAPSED_KEY = 'fin.sidebar.collapsed';
const AUTO_HIDE_LEAVE_DELAY = 400;

export function Sidebar({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const pathname = usePathname();
  const autoHide = useAutoHideNav();
  const [peek, setPeek] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const clearHideTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };
  const revealNow = () => {
    clearHideTimer();
    setPeek(true);
  };
  const scheduleHide = () => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setPeek(false), AUTO_HIDE_LEAVE_DELAY);
  };
  useEffect(() => clearHideTimer, []);

  const hidden = autoHide && !peek;
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

  // The spacer (reserves layout space, since the panel itself is `fixed`) and the panel
  // move on one shared duration+easing curve so they stay in lockstep — but the spacer
  // MUST stay a plain element, not a motion/transform-bearing one: a `position: fixed`
  // descendant of any ancestor with a `transform` (which framer-motion sets, even for a
  // motion.div only animating `width`) stops being fixed to the *viewport* and becomes
  // fixed to that transformed ancestor instead. That regression is exactly what made the
  // sidebar scroll away with the page instead of floating — the panel must have no
  // transformed ancestor between it and the viewport, so the spacer is CSS-only here.
  const SIDEBAR_DURATION = 320;
  const SIDEBAR_EASE = [0.16, 1, 0.3, 1] as const;
  const asideWidth = collapsed ? 64 : 256;

  return (
    <div
      className="hidden shrink-0 lg:block"
      style={{
        width: hidden ? 0 : collapsed ? 96 : 288,
        transition: `width ${SIDEBAR_DURATION}ms cubic-bezier(${SIDEBAR_EASE.join(',')})`,
      }}
    >
      {/* Edge-hover trigger: only needed (and only rendered) while the sidebar is actually
          hidden — reveals it on approach without a continuous mousemove listener. */}
      {autoHide && hidden ? (
        <div className="fixed inset-y-0 left-0 z-40 hidden w-2.5 lg:block" onMouseEnter={revealNow} aria-hidden="true" />
      ) : null}
      <motion.aside
        onMouseEnter={autoHide ? revealNow : undefined}
        onMouseLeave={autoHide ? scheduleHide : undefined}
        animate={{ width: asideWidth, x: hidden ? -(asideWidth + 32) : 0 }}
        transition={{ duration: SIDEBAR_DURATION / 1000, ease: SIDEBAR_EASE }}
        className="glass-nav fixed bottom-4 left-4 top-4 z-40 flex flex-col overflow-hidden p-3"
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
                  {APP_NAME}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <button
            onClick={toggle}
            className={`flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-full border border-[--hairline-strong] bg-[--bg-tertiary] text-[--text-secondary] transition-colors hover:border-[--active-pill-border] hover:text-[--text-primary] ${collapsed ? 'mx-auto' : ''}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={20} strokeWidth={2.25} /> : <ChevronLeft size={20} strokeWidth={2.25} />}
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
