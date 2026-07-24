import { useState, useCallback } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to standardize async execution state management (loading, error, data).
 */
export function useAsync<T = any>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (asyncFunction: () => Promise<T>): Promise<T | null> => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await asyncFunction();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err: any) {
      const errorMsg = err?.message || 'An error occurred during async execution';
      setState({ data: null, loading: false, error: errorMsg });
      return null;
    }
  }, []);

  return { ...state, execute };
}
