/**
 * Medical Module Hooks
 * Self-contained hooks for the medical module
 */

import { useState, useEffect, useCallback } from 'react';

// Cortex metrics data structure
export interface CortexMetrics {
  vectorsProcessed: number;
  activeModels: number;
  bridgeStatus: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  emotionTrend?: Array<{
    label: string;
    value: number;
    color: string;
  }>;
}

/**
 * Hook to fetch cortex metrics from the medical cortex service
 * Polls the backend API for cortex status
 */
export function useCortexMetrics(refreshInterval = 5000) {
  const [cortex, setCortex] = useState<CortexMetrics>({
    vectorsProcessed: 0,
    activeModels: 0,
    bridgeStatus: 'disconnected',
    lastSync: new Date().toISOString(),
    emotionTrend: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCortexMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/cortex/metrics');
      if (response.ok) {
        const data = await response.json();
        setCortex({
          vectorsProcessed: data.vectors_processed || data.vectorsProcessed || 0,
          activeModels: data.active_models || data.activeModels || 0,
          bridgeStatus: data.bridge_status || data.bridgeStatus || 'connected',
          lastSync: data.last_sync || data.lastSync || new Date().toISOString(),
          emotionTrend: data.emotion_trend || data.emotionTrend || []
        });
        setError(null);
      } else {
        // API not available, use defaults
        setCortex(prev => ({
          ...prev,
          bridgeStatus: 'disconnected'
        }));
      }
    } catch (err) {
      // Silently handle - cortex metrics are non-critical
      setCortex(prev => ({
        ...prev,
        bridgeStatus: 'disconnected'
      }));
      setError(err instanceof Error ? err : new Error('Failed to fetch cortex metrics'));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchCortexMetrics();
  }, [fetchCortexMetrics]);

  useEffect(() => {
    fetchCortexMetrics();
    
    const interval = setInterval(fetchCortexMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchCortexMetrics, refreshInterval]);

  return { cortex, loading, error, refresh };
}

/**
 * Hook to manage app-level data for medical components
 * Provides cortex metrics and other shared state
 */
export function useAppData() {
  const { cortex, loading: loadingCortex, refresh: refreshCortex } = useCortexMetrics();
  
  return {
    cortex,
    loadingCortex,
    refreshCortex
  };
}
