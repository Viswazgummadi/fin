"use client";

import { useEffect, useState } from 'react';

export function OnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${online ? 'border-accent/40 bg-accent/10 text-accent' : 'border-warning/40 bg-warning/10 text-warning'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-accent' : 'bg-warning'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
