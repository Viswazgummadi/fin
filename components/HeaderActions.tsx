"use client";

import { useState } from 'react';
import { Search, Zap } from 'lucide-react';
import { OnlineStatus } from './OnlineStatus';
import { AuthButtons } from './AuthButtons';
import { QuickAddModal } from './QuickAddModal';
import { ThemeToggle } from './ThemeToggle';
import { COMMAND_PALETTE_OPEN_EVENT } from './CommandPalette';

export function HeaderActions() {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 sm:gap-3 fade-up">
      <OnlineStatus />
      <button
        onClick={() => window.dispatchEvent(new Event(COMMAND_PALETTE_OPEN_EVENT))}
        className="btn-ghost inline-flex items-center gap-2 text-sm"
        aria-label="Open command palette"
      >
        <Search size={15} />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden rounded border border-[--hairline] px-1.5 py-0.5 text-[10px] text-[--text-muted] md:inline">⌘K</kbd>
      </button>
      <button
        onClick={() => setIsQuickAddOpen(true)}
        className="btn-primary hidden items-center gap-1.5 text-sm sm:inline-flex"
        aria-label="Open quick spend"
      >
        <Zap size={15} />
        Quick
      </button>
      <ThemeToggle />
      <div className="hidden lg:block">
        <AuthButtons />
      </div>
      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </div>
  );
}
