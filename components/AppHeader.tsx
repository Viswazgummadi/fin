"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { HeaderActions } from './HeaderActions';
import { APP_NAME } from '../lib/brand';
import { useAutoHideNav } from '../lib/useAutoHideNav';

const AUTO_HIDE_LEAVE_DELAY = 400;

export function AppHeader() {
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

  return (
    <>
      {autoHide && hidden ? (
        <div className="fixed inset-x-0 top-0 z-40 hidden h-2.5 lg:block" onMouseEnter={revealNow} aria-hidden="true" />
      ) : null}
      <motion.header
        onMouseEnter={autoHide ? revealNow : undefined}
        onMouseLeave={autoHide ? scheduleHide : undefined}
        animate={{ y: hidden ? -80 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        style={hidden ? { pointerEvents: 'none' } : undefined}
        className="sticky top-3 z-30 mx-3 sm:mx-4 lg:mx-6"
      >
        <div className="glass-2 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/" className="min-w-0 lg:hidden">
            <div className="truncate font-mono text-sm font-medium tracking-wide text-[--text-primary]">{APP_NAME}</div>
          </Link>
          <div className="ml-auto">
            <HeaderActions />
          </div>
        </div>
      </motion.header>
    </>
  );
}
