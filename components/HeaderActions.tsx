"use client";

import { useState } from 'react';
import { OnlineStatus } from './OnlineStatus';
import { AuthButtons } from './AuthButtons';
import { QuickAddModal } from './QuickAddModal';

export function HeaderActions() {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3">
        <OnlineStatus />
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="rounded-[--radius] bg-[--accent] px-3 py-1.5 text-sm font-semibold text-[--bg-primary] hover:opacity-90"
        >
          + Quick
        </button>
        <AuthButtons />
      </div>
      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </>
  );
}
