import { createContext, useContext, useEffect, useState } from 'react';
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
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const [scan, setScan] = useState<ScanProgress>({
    isScanning: false,
    scannedCount: 0,
    totalToScan: 0,
    progress: 0,
    rateLimited: false,
    totalAvailable: 0,
  });

  useEffect(() => {
    if (!socket) return;

    // Scan lifecycle events
    socket.on('scan:start', () => {
      console.log('[ScanContext] Scan started');
      setScan((prev) => ({
        ...prev,
        isScanning: true,
        scannedCount: 0,
        progress: 0,
      }));
    });

    socket.on('scan:rate-limited', (data: { scanned: number; total: number; totalAvailable: number }) => {
      console.log('[ScanContext] Rate limited:', data);
      setScan((prev) => ({
        ...prev,
        totalToScan: data.total,
        totalAvailable: data.totalAvailable,
        rateLimited: true,
      }));
    });

    socket.on('repo:scanned', (data: { scannedCount: number; totalToScan: number; progress: number }) => {
      console.log('[ScanContext] Repo scanned - Progress:', data.progress);
      setScan((prev) => ({
        ...prev,
        scannedCount: data.scannedCount,
        totalToScan: data.totalToScan,
        progress: data.progress,
      }));
    });

    socket.on('scan:complete', () => {
      console.log('[ScanContext] Scan completed');
      setScan((prev) => ({
        ...prev,
        isScanning: false,
        progress: 100,
      }));
      // Reset after 2 seconds
      setTimeout(() => {
        setScan({
          isScanning: false,
          scannedCount: 0,
          totalToScan: 0,
          progress: 0,
          rateLimited: false,
          totalAvailable: 0,
        });
      }, 2000);
    });

    return () => {
      socket.off('scan:start');
      socket.off('scan:rate-limited');
      socket.off('repo:scanned');
      socket.off('scan:complete');
    };
  }, [socket]);

  return <ScanContext.Provider value={{ scan }}>{children}</ScanContext.Provider>;
}

export function useScan() {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error('useScan must be used within ScanProvider');
  }
  return context;
}
