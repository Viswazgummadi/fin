"use client";

import { useState } from 'react';

export function ExportBackupClient({ snapshot }: { snapshot: unknown }) {
  const [status, setStatus] = useState('');

  const download = () => {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Backup downloaded.');
  };

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
      <div>
        <div className="font-medium">Backup / Export</div>
        <p className="mt-1 text-sm text-text-secondary">Download your current data as JSON. Import can be added next if you want restore flow.</p>
      </div>
      <button onClick={download} className="rounded-lg bg-accent px-4 py-2 font-medium text-black">Download JSON backup</button>
      {status ? <div className="text-sm text-text-secondary">{status}</div> : null}
    </div>
  );
}
