"use client";

import { useEffect, useState } from 'react';
import { getOfflineOutboxCount, OFFLINE_OUTBOX_EVENT } from '../lib/offline-sync';

export function OnlineStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const updatePending = () => setPending(getOfflineOutboxCount());

    update();
    updatePending();

    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener(OFFLINE_OUTBOX_EVENT, updatePending);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener(OFFLINE_OUTBOX_EVENT, updatePending);
    };
  }, []);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${online ? 'border-accent/40 bg-accent/10 text-accent' : 'border-warning/40 bg-warning/10 text-warning'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-accent' : 'bg-warning'}`} />
      {online ? 'Online' : 'Offline'}
      {pending ? <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] text-[--text-primary]">{pending} pending</span> : null}
    </span>
  );
}
