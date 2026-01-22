/**
 * useDataAdapter - Hook for loading and managing adapter data.
 * 
 * Handles fetching, polling, and state management for globe data.
 * 
 * @example
 * // Basic usage with an adapter
 * const { data, loading, error } = useDataAdapter(flightAdapter);
 * 
 * // With custom config
 * const { data } = useDataAdapter(myAdapter, {
 *   url: 'https://api.example.com/data',
 *   refreshInterval: 5000
 * });
 * 
 * // With static JSON data
 * const { data } = useDataAdapter(myAdapter, {
 *   data: myJsonData
 * });
 */

import { useState, useEffect, useCallback } from 'react';
import { DataAdapter, AdapterConfig, GlobeDataItem } from '../adapters/types';

interface UseDataAdapterResult {
  /** Normalized data items ready for rendering */
  data: GlobeDataItem[];
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
}

export function useDataAdapter(
  adapter: DataAdapter,
  config: AdapterConfig = {}
): UseDataAdapterResult {
  const [data, setData] = useState<GlobeDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await adapter(config);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Adapter error:', err);
    } finally {
      setLoading(false);
    }
  }, [adapter, config.url, config.data, config.refreshInterval]);

  useEffect(() => {
    fetchData();

    // Set up polling if interval specified
    if (config.refreshInterval && config.refreshInterval > 0) {
      const intervalId = setInterval(fetchData, config.refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchData, config.refreshInterval]);

  return { data, loading, error, refresh: fetchData };
}

/**
 * useMultipleAdapters - Combine data from multiple adapters.
 * 
 * @example
 * const { data, loading } = useMultipleAdapters([
 *   { adapter: flightAdapter },
 *   { adapter: trafficAdapter },
 * ]);
 */
export function useMultipleAdapters(
  adapters: Array<{ adapter: DataAdapter; config?: AdapterConfig }>
): UseDataAdapterResult {
  const [data, setData] = useState<GlobeDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const results = await Promise.all(
        adapters.map(({ adapter, config }) => adapter(config || {}))
      );
      setData(results.flat());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [adapters]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, error, refresh: fetchAll };
}

export default useDataAdapter;
