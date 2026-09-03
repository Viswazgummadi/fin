"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { readAutoHideNavPref, writeAutoHideNavPref } from '../lib/nav-preferences';

export function AutoHideNavSetting() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(readAutoHideNavPref());
  }, []);

  const toggle = () => {
    setEnabled((current) => {
      const next = !current;
      writeAutoHideNavPref(next);
      return next;
    });
  };

  return (
    <div className="surface-card flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="kicker">Desktop only</div>
        <div className="mt-2 font-medium">Auto-hide navigation</div>
        <div className="mt-1 text-sm text-[--text-secondary]">
          Sidebar and header stay out of the way and slide in when your cursor nears the screen edge. Has no effect on
          phones/tablets.
        </div>
      </div>
      <button
        onClick={toggle}
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle auto-hide navigation"
        className="relative flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors"
        style={{
          background: enabled ? 'var(--accent)' : 'var(--bg-tertiary)',
          borderColor: enabled ? 'var(--accent)' : 'var(--hairline-strong)',
        }}
      >
        <motion.span
          className="h-5 w-5 rounded-full shadow-sm"
          style={{ background: enabled ? 'var(--on-accent)' : 'var(--text-secondary)' }}
          animate={{ x: enabled ? 22 : 3 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </button>
    </div>
  );
}
