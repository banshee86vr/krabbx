import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useSocket } from './SocketContext';
import type { InAppNotification } from '../types';

interface NotificationContextValue {
  notifications: InAppNotification[];
  unreadCount: number;
  addNotification: (notification: InAppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const { socket } = useSocket();

  const addNotification = useCallback((notification: InAppNotification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Listen for socket notifications
  useEffect(() => {
    if (!socket) return;

    socket.on('notification', (data: InAppNotification) => {
      addNotification(data);
    });

    socket.on('repository:updated', (data: { id: string; name: string; outdatedDependencies: number }) => {
      addNotification({
        id: `repo-${data.id}-${Date.now()}`,
        subject: 'Repository Updated',
        content: `${data.name} has ${data.outdatedDependencies} outdated dependencies`,
        trigger: 'scanComplete',
        timestamp: new Date().toISOString(),
        read: false,
      });
    });

    socket.on('scan:complete', (data: { totalRepos: number; timestamp: string }) => {
      addNotification({
        id: `scan-${Date.now()}`,
        subject: 'Scan Complete',
        content: `Organization scan completed. ${data.totalRepos} repositories scanned.`,
        trigger: 'scanComplete',
        timestamp: data.timestamp,
        read: false,
      });
    });

    return () => {
      socket.off('notification');
      socket.off('repository:updated');
      socket.off('scan:complete');
    };
  }, [socket, addNotification]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
