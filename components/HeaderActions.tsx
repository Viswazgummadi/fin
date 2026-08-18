"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { OnlineStatus } from './OnlineStatus';
import { AuthButtons } from './AuthButtons';
import { QuickAddModal } from './QuickAddModal';

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Transactions', href: '/transactions' },
  { label: 'Analysis', href: '/analysis' },
  { label: 'Manage', href: '/manage' },
  { label: 'Settings', href: '/settings' },
  { label: 'Journal', href: '/whathappened' },
] as const;

export function HeaderActions() {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3 fade-up">
        <OnlineStatus />
        <button
          onClick={() => setIsMenuOpen(true)}
          className="btn-secondary text-sm lg:hidden"
          aria-label="Open navigation menu"
          aria-expanded={isMenuOpen}
        >
          Menu
        </button>
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="btn-primary text-sm"
          aria-label="Open quick spend"
        >
          Quick
        </button>
        <div className="hidden lg:block">
          <AuthButtons />
        </div>
      </div>
      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
      {isMenuOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMenuOpen(false)}
            >
              <div
                className="absolute left-0 top-0 h-full w-[min(88vw,20rem)] border-r border-[--border] bg-[--bg-secondary] p-4 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="kicker">Navigation</div>
                    <div className="mt-1 font-medium">Menu</div>
                  </div>
                  <button onClick={() => setIsMenuOpen(false)} className="btn-ghost px-3 py-2 text-sm">
                    Close
                  </button>
                </div>
                <nav className="mt-4 space-y-2">
                  {navItems.map((item) => {
                    const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={`nav-link block min-h-11 rounded-[--radius] px-3 py-3 text-sm ${
                          active ? 'nav-link-active text-[--text-primary]' : 'text-[--text-secondary]'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsQuickAddOpen(true);
                    }}
                    className="btn-primary w-full text-sm"
                  >
                    Quick spend
                  </button>
                  <AuthButtons />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
