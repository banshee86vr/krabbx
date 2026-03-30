import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '../context/NotificationContext';
import { useScan } from '../context/ScanContext';
import { repositoryApi } from '../services/api';

function createScanNotification(subject: string, content: string) {
  return {
    id: `scan-local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    subject,
    content,
    trigger: 'scanComplete' as const,
    timestamp: new Date().toISOString(),
    read: false,
  };
}

export function useOrganizationScan() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { startScan } = useScan();

  return useMutation({
    mutationFn: repositoryApi.scan,
    onSuccess: (data) => {
      startScan();
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });

      addNotification(
        createScanNotification(
          'Scan Started',
          data.message === 'Scan already running'
            ? 'An organization scan is already running.'
            : 'Organization scan started. Progress will update automatically.'
        )
      );
    },
    onError: (error) => {
      addNotification(
        createScanNotification(
          'Scan Failed to Start',
          error instanceof Error ? error.message : 'Unable to start the organization scan.'
        )
      );
    },
  });
}
