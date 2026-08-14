"use client";

import { useState } from 'react';
import { OnlineStatus } from './OnlineStatus';
import { AuthButtons } from './AuthButtons';
import { QuickAddModal } from './QuickAddModal';

export function HeaderActions() {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3 fade-up">
        <OnlineStatus />
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="btn-primary text-sm"
        >
          + Quick
        </button>
        <AuthButtons />
      </div>
      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </>
  );
}
