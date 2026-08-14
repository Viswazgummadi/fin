"use client";

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '../utils/supabase/client';
import { flushOfflineOutbox, OFFLINE_OUTBOX_EVENT } from '../lib/offline-sync';
import { queryKeys } from '../lib/query-keys';

export function SyncManager() {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();
  const isFlushing = useRef(false);

  useEffect(() => {
    if (!supabase) return;

    const flush = async () => {
      if (isFlushing.current || !navigator.onLine) return;
      isFlushing.current = true;

      try {
        const result = await flushOfflineOutbox(supabase);
        if (result.flushed > 0) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.quickSpendConfig }),
            queryClient.invalidateQueries({ queryKey: queryKeys.transactionWindows }),
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardTransactions }),
            queryClient.invalidateQueries({ queryKey: queryKeys.analysisTransactions }),
            queryClient.invalidateQueries({ queryKey: queryKeys.reviewTransactions }),
            queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
          ]);
        }
      } finally {
        isFlushing.current = false;
      }
    };

    flush();

    const handleOnline = () => {
      void flush();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void flush();
      }
    };

    const interval = window.setInterval(() => {
      void flush();
    }, 30000);

    window.addEventListener('online', handleOnline);
    window.addEventListener(OFFLINE_OUTBOX_EVENT, handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener(OFFLINE_OUTBOX_EVENT, handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [supabase, queryClient]);

  return null;
}
