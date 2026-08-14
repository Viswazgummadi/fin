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
    <span className={`rounded-full border px-2 py-1 text-[11px] ${online ? 'border-accent text-accent' : 'border-warning text-warning'}`}>
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
