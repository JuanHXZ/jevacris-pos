import { useState, useEffect } from 'react';
import { syncEngine, type SyncStatus } from '../sync/syncEngine';

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | undefined>();

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus, syncedDate) => {
      setStatus(newStatus);
      if (syncedDate) setLastSyncedAt(syncedDate);
    });

    return () => unsubscribe();
  }, []);

  const triggerSync = () => {
    return syncEngine.sync();
  };

  return {
    status,
    lastSyncedAt,
    triggerSync,
    isSyncing: status === 'syncing'
  };
}
