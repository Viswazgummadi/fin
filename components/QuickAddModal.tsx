"use client";

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { QuickAdd } from './QuickAdd';

export function QuickAddModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-up" onClick={onClose}>
      <div className="surface-card w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[--border] p-4">
          <div>
            <div className="kicker">Fast capture</div>
            <h2 className="mt-1 font-semibold">Quick spend</h2>
          </div>
          <button onClick={onClose} className="btn-ghost px-3 py-2 text-sm">Close</button>
        </div>
        <div className="p-4">
          <QuickAdd onSuccess={onClose} />
        </div>
      </div>
    </div>,
    document.body
  );
}
