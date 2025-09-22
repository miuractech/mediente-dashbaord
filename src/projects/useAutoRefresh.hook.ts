import { useEffect, useRef, useCallback } from 'react';
import { useWindowActivity } from './useWindowActivity.hook';

interface UseAutoRefreshOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onRefresh: () => void;
}

export function useAutoRefresh({ 
  enabled = true, 
  interval = 120000, // 2 minutes default
  onRefresh 
}: UseAutoRefreshOptions) {
  const isWindowActive = useWindowActivity();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onRefreshRef = useRef(onRefresh);

  // Keep onRefresh reference current
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const startInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      onRefreshRef.current();
    }, interval);
  }, [interval]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled && isWindowActive) {
      startInterval();
    } else {
      stopInterval();
    }

    return () => stopInterval();
  }, [enabled, isWindowActive, startInterval, stopInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopInterval();
  }, [stopInterval]);

  return {
    isActive: enabled && isWindowActive,
    isWindowActive,
    start: startInterval,
    stop: stopInterval,
  };
}

export default useAutoRefresh;
