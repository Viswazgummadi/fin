"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Zap, CornerDownLeft } from 'lucide-react';
import { ALL_DESTINATIONS } from '../lib/nav';
import { QuickAddModal } from './QuickAddModal';

export const COMMAND_PALETTE_OPEN_EVENT = 'fin:open-command-palette';

type Entry =
  | { kind: 'nav'; label: string; hint: string; icon: (typeof ALL_DESTINATIONS)[number]['icon']; run: () => void }
  | { kind: 'action'; label: string; hint: string; icon: typeof Zap; run: () => void };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isCombo) {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    const openFromEvent = () => setOpen(true);
    window.addEventListener('keydown', handler);
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, openFromEvent);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, openFromEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const navEntries: Entry[] = ALL_DESTINATIONS.map((item) => ({
      kind: 'nav',
      label: item.label,
      hint: item.href,
      icon: item.icon,
      run: () => router.push(item.href),
    }));
    const actionEntries: Entry[] = [
      {
        kind: 'action',
        label: 'Quick spend',
        hint: 'Log a fast expense',
        icon: Zap,
        run: () => setQuickAddOpen(true),
      },
    ];
    return [...actionEntries, ...navEntries];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) => entry.label.toLowerCase().includes(q));
  }, [entries, query]);

  const select = (entry: Entry) => {
    entry.run();
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const entry = filtered[activeIndex];
      if (entry) select(entry);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="glass-3 w-full max-w-lg overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-[--hairline] px-4 py-3">
                <Search size={18} className="shrink-0 text-[--text-muted]" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Jump to, or quick spend…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[--text-primary] outline-none placeholder:text-[--text-muted]"
                />
                <kbd className="rounded border border-[--hairline] px-1.5 py-0.5 text-[10px] text-[--text-muted]">esc</kbd>
              </div>
              <div className="max-h-[50vh] overflow-y-auto p-2">
                {filtered.length ? (
                  filtered.map((entry, index) => {
                    const Icon = entry.icon;
                    const isActive = index === activeIndex;
                    return (
                      <button
                        key={`${entry.kind}-${entry.label}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => select(entry)}
                        className={`flex w-full items-center gap-3 rounded-[--radius-sm] px-3 py-2.5 text-left text-sm transition-colors ${
                          isActive ? 'bg-[--accent-wash] text-[--text-primary]' : 'text-[--text-secondary]'
                        }`}
                      >
                        <Icon size={16} className="shrink-0" />
                        <span className="flex-1">{entry.label}</span>
                        {entry.kind === 'nav' ? <span className="text-xs text-[--text-muted]">{entry.hint}</span> : null}
                        {isActive ? <CornerDownLeft size={14} className="shrink-0 text-[--text-muted]" /> : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-[--text-muted]">No matches.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <QuickAddModal isOpen={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </>,
    document.body
  );
}
