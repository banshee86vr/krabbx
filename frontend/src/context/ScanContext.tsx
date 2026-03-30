import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { repositoryApi } from '../services/api';
import { useSocket } from './SocketContext';

interface ScanProgress {
  isScanning: boolean;
  scannedCount: number;
  totalToScan: number;
  progress: number;
  rateLimited: boolean;
  totalAvailable: number;
}

interface ScanContextType {
  scan: ScanProgress;
  startScan: () => void;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

const emptyScanState: ScanProgress = {
  isScanning: false,
  scannedCount: 0,
  totalToScan: 0,
  progress: 0,
  rateLimited: false,
  totalAvailable: 0,
};

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const [scan, setScan] = useState<ScanProgress>(emptyScanState);

  const applyScanStatus = useCallback((status: Partial<ScanProgress>) => {
    setScan((prev) => ({
      ...prev,
      ...status,
    }));
  }, []);

  const resetScan = useCallback(() => {
    setScan(emptyScanState);
  }, []);

  const startScan = useCallback(() => {
    setScan((prev) => ({
      ...prev,
      isScanning: true,
      scannedCount: 0,
      totalToScan: prev.totalToScan,
      progress: 0,
      rateLimited: false,
      totalAvailable: prev.totalAvailable,
    }));
  }, []);

  const syncScanStatus = useCallback(async () => {
    try {
      const status = await repositoryApi.getScanStatus();
      setScan({
        isScanning: status.isScanning,
        scannedCount: status.scannedCount,
        totalToScan: status.totalToScan,
        progress: status.progress,
        rateLimited: status.rateLimited,
        totalAvailable: status.totalAvailable,
      });
    } catch (error) {
      console.error('[ScanContext] Failed to sync scan status', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(async () => {
      try {
        const status = await repositoryApi.getScanStatus();

        if (cancelled) {
          return;
        }

        applyScanStatus({
          isScanning: status.isScanning,
          scannedCount: status.scannedCount,
          totalToScan: status.totalToScan,
          progress: status.progress,
          rateLimited: status.rateLimited,
          totalAvailable: status.totalAvailable,
        });
      } catch (error) {
        console.error('[ScanContext] Failed to sync initial scan status', error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [applyScanStatus]);

  useEffect(() => {
    if (!scan.isScanning) {
      return;
    }

    const interval = window.setInterval(() => {
      void syncScanStatus();
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [scan.isScanning, syncScanStatus]);

  useEffect(() => {
    if (!socket) return;

    // Scan lifecycle events
    socket.on('scan:start', () => {
      console.log('[ScanContext] Scan started');
      startScan();
      void syncScanStatus();
    });

    socket.on('scan:rate-limited', (data: { scanned: number; total: number; totalAvailable: number }) => {
      console.log('[ScanContext] Rate limited:', data);
      applyScanStatus({
        totalToScan: data.total,
        totalAvailable: data.totalAvailable,
        rateLimited: true,
      });
    });

    socket.on('repo:scanned', (data: { scannedCount: number; totalToScan: number; progress: number }) => {
      console.log('[ScanContext] Repo scanned - Progress:', data.progress);
      applyScanStatus({
        isScanning: true,
        scannedCount: data.scannedCount,
        totalToScan: data.totalToScan,
        progress: data.progress,
      });
    });

    socket.on('scan:complete', () => {
      console.log('[ScanContext] Scan completed');
      applyScanStatus({
        isScanning: false,
        progress: 100,
      });
      // Reset after 2 seconds
      window.setTimeout(() => {
        resetScan();
      }, 2000);
    });

    return () => {
      socket.off('scan:start');
      socket.off('scan:rate-limited');
      socket.off('repo:scanned');
      socket.off('scan:complete');
    };
  }, [applyScanStatus, resetScan, socket, startScan, syncScanStatus]);

  return <ScanContext.Provider value={{ scan, startScan }}>{children}</ScanContext.Provider>;
}

export function useScan() {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error('useScan must be used within ScanProvider');
  }
  return context;
}
