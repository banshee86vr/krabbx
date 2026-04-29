import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useScan } from '../context/ScanContext';
import { repositoryApi } from '../services/api';

export function useOrganizationScan() {
  const queryClient = useQueryClient();
  const { startScan } = useScan();

  return useMutation({
    mutationFn: repositoryApi.scan,
    onSuccess: () => {
      startScan();
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
