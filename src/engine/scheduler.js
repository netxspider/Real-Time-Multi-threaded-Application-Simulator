// src/engine/scheduler.js
// Pure scheduling algorithm functions

/**
 * FCFS: First-Come-First-Served — first thread in the ready queue wins.
 * Non-preemptive.
 */
export function fcfs(readyQueue) {
  if (readyQueue.length === 0) return null;
  return readyQueue[0];
}

/**
 * SJF: Shortest Job First — picks the thread with the smallest remaining time
 * from the ready queue (non-preemptive; caller keeps running thread on CPU).
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

/**
 * SRTF: Shortest Remaining Time First — preemptive SJF.
 * Considers ALL threads that are READY or RUNNING (including the current CPU thread)
 * and picks the one with the smallest remaining time.
 * The caller is responsible for preempting the current thread if the chosen ID differs.
 *
 * @param {string[]}  readyQueue      - IDs of READY threads
 * @param {object[]}  threads         - full thread list
 * @param {string|null} cpuThread     - currently running thread ID (or null)
 * @returns {string|null} ID of thread that should be on CPU
 */
export function srtf(readyQueue, threads, cpuThread) {
  // Build candidate pool: ready threads + currently running thread (if any)
  const candidateIds = [...new Set([...readyQueue, ...(cpuThread ? [cpuThread] : [])])];
  if (candidateIds.length === 0) return null;

  let minTime = Infinity;
  let chosen = null;
  for (const tid of candidateIds) {
    const t = threads.find(th => th.id === tid);
    if (t && (t.state === 'READY' || t.state === 'RUNNING') && t.remainingTime < minTime) {
      minTime = t.remainingTime;
      chosen = tid;
    }
  }
  return chosen;
}

/**
 * Priority Scheduling — picks the thread with the best priority from the ready queue.
 * Non-preemptive by default (caller keeps the running thread unless explicitly overriding).
 * For preemptive priority, caller should also pass the current CPU thread as a candidate.
 *
 * @param {string[]}  readyQueue   - IDs of READY threads
 * @param {object[]}  threads      - full thread list
 * @param {'lowest'|'highest'} mode
 *   'lowest'  → smallest priority number = highest precedence (e.g. 1 is most urgent)
 *   'highest' → largest priority number  = highest precedence (e.g. 10 is most urgent)
 * @param {string|null} cpuThread  - currently running thread (for preemptive mode)
 * @returns {string|null}
 */
export function prioritySchedule(readyQueue, threads, mode, cpuThread) {
  // For preemptive priority: include current running thread as a candidate too
  const candidateIds = [...new Set([...readyQueue, ...(cpuThread ? [cpuThread] : [])])];
  if (candidateIds.length === 0) return null;

  let bestPriority = mode === 'lowest' ? Infinity : -Infinity;
  let chosen = null;
  for (const tid of candidateIds) {
    const t = threads.find(th => th.id === tid);
    if (!t || (t.state !== 'READY' && t.state !== 'RUNNING')) continue;
    const p = t.priority ?? 1;
    if (mode === 'lowest' ? p < bestPriority : p > bestPriority) {
      bestPriority = p;
      chosen = tid;
    }
  }
  return chosen;
}
