"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { NAV_ITEMS, isActiveNavPath } from '../lib/nav';
import { QuickAddModal } from './QuickAddModal';

export function MobileDock() {
  const pathname = usePathname();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 lg:hidden">
        <div className="glass-nav mx-auto flex h-16 max-w-md items-center justify-around px-2">
          {NAV_ITEMS.map((item) => {
            const active = isActiveNavPath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                className="nav-link relative flex h-11 w-11 items-center justify-center rounded-full"
              >
                {active ? (
                  <motion.span
                    layoutId="mobile-nav-active-pill"
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(180deg, rgba(52,211,153,0.2), rgba(129,140,248,0.14))',
                      border: '1px solid rgba(52,211,153,0.3)',
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  />
                ) : null}
                <Icon size={20} strokeWidth={2} className={`relative z-[1] ${active ? 'text-[--text-primary]' : 'text-[--text-secondary]'}`} />
              </Link>
            );
          })}
        </div>
      </div>

      <motion.button
        onClick={() => setIsQuickAddOpen(true)}
        whileTap={{ scale: 0.92 }}
        aria-label="Quick spend"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full lg:hidden"
        style={{
          background: 'linear-gradient(165deg, rgba(255,255,255,0.25), transparent), var(--accent)',
          boxShadow: '0 14px 32px rgba(52,211,153,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        <Plus size={26} strokeWidth={2.5} className="text-[#04120c]" />
      </motion.button>

      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </>
  );
}
