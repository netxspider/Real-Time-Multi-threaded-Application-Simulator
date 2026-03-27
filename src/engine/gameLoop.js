// src/engine/gameLoop.js
import { useEffect, useRef } from 'react';
import { useSimStore } from '../store/simulationStore';

/**
 * useGameLoop
 * Drives the simulation by calling tick() at the configured speed.
 * Speed is in ticks/sec (1 to 1000).
 */
export function useGameLoop() {
  const intervalRef = useRef(null);

  useEffect(() => {
    const unsub = useSimStore.subscribe((state) => {
      const { isRunning, speed, tick } = state;
      // Clear old interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (isRunning) {
        const ms = Math.max(10, Math.round(1000 / speed));
        intervalRef.current = setInterval(() => {
          // Re-read isRunning in case it changed
          const s = useSimStore.getState();
          if (s.isRunning) s.tick();
        }, ms);
      }
    });

    return () => {
      unsub();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
