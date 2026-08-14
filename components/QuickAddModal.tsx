"use client";

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { QuickAdd } from './QuickAdd';

export function QuickAddModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-thin bg-[--bg-secondary]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-thin">
          <h2 className="font-semibold">Quick Add</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>
        <div className="p-4">
          <QuickAdd onSuccess={onClose} />
        </div>
      </div>
    </div>,
    document.body
  );
}
