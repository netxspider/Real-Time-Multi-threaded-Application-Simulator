// src/engine/syncGameLoop.js
import { useEffect, useRef } from 'react';
import { useSyncStore } from '../store/syncStore';

/**
 * useSyncGameLoop
 * Drives the sync simulation by calling _tick() at the configured speed.
 */
export function useSyncGameLoop() {
  const intervalRef = useRef(null);

  useEffect(() => {
    const unsub = useSyncStore.subscribe((state) => {
      const { isRunning, speed } = state;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (isRunning) {
        const ms = Math.max(100, Math.round(1000 / speed));
        intervalRef.current = setInterval(() => {
          const s = useSyncStore.getState();
          if (s.isRunning) s._tick();
        }, ms);
      }
    });

    return () => {
      unsub();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
