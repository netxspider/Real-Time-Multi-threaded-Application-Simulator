// src/engine/scheduler.js
// Pure scheduling algorithm functions

/**
 * FCFS: First thread in the ready queue wins
 */
export function fcfs(readyQueue) {
  if (readyQueue.length === 0) return null;
  return readyQueue[0];
}

/**
 * Round Robin: Uses quantumRemaining to decide preemption
 * Returns { nextId, shouldPreempt }
 */
export function roundRobin(readyQueue, threads, quantumRemaining) {
  if (readyQueue.length === 0) return { nextId: null, shouldPreempt: false };
  const nextId = readyQueue[0];
  const shouldPreempt = quantumRemaining <= 0;
  return { nextId, shouldPreempt };
}

/**
 * SJF: Shortest remaining time among ready threads
 */
export function sjf(readyQueue, threads) {
  if (readyQueue.length === 0) return null;
  let minTime = Infinity;
  let chosen = readyQueue[0];
  for (const tid of readyQueue) {
    const t = threads.find(th => th.id === tid);
    if (t && t.remainingTime < minTime) {
      minTime = t.remainingTime;
      chosen = tid;
    }
  }
  return chosen;
}
