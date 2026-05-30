import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useOffline } from '../../providers/OfflineProvider';

export function useOfflineQuery<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error, T>, 'queryKey' | 'queryFn'>
) {
  const { syncVersion } = useOffline();

  return useQuery<T, Error, T>({
    queryKey: [...queryKey, syncVersion],
    queryFn,
    staleTime: Infinity,
    ...options,
  });
}
