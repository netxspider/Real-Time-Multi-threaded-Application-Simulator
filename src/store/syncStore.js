// src/store/syncStore.js
import { create } from 'zustand';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const THREAD_COLORS = [
  'hsl(210,85%,65%)',  // blue
  'hsl(280,78%,68%)',  // purple
  'hsl(145,70%,55%)',  // green
  'hsl(30,90%,62%)',   // orange
  'hsl(340,80%,65%)',  // pink/rose
  'hsl(175,70%,52%)',  // teal
  'hsl(55,85%,58%)',   // yellow
  'hsl(0,78%,62%)',    // red
  'hsl(260,72%,70%)',  // lavender
  'hsl(105,68%,58%)',  // lime
];

let _lid = 0;
function mkLog(msg) { return { id: ++_lid, msg }; }

// ─── Code definitions for each mechanism ──────────────────────────────────────
export const CODE_LINES = {
  Mutex: [
    { code: '// ── Entry Section ─────────────────', phase: null,      isComment: true },
    { code: 'pthread_mutex_lock(&mutex);',            phase: 'acquire', isComment: false },
    { code: '  // if locked → thread blocks here',   phase: 'blocked', isComment: true },
    { code: '',                                       phase: null,      isComment: false },
    { code: '// ── Critical Section ───────────────', phase: null,      isComment: true },
    { code: '  execute_critical_section();',          phase: 'in_cs',   isComment: false },
    { code: '',                                       phase: null,      isComment: false },
    { code: '// ── Exit Section ───────────────────', phase: null,      isComment: true },
    { code: 'pthread_mutex_unlock(&mutex);',          phase: 'release', isComment: false },
    { code: '  // signal → wakes next waiter',       phase: 'wakeup',  isComment: true },
  ],
  CountingSemaphore: [
    { code: '// ── Entry Section ─────────────────', phase: null,      isComment: true },
    { code: 'sem_wait(&S):',                          phase: 'acquire', isComment: false },
    { code: '  while (S <= 0) block();',              phase: 'blocked', isComment: false },
    { code: '  S -= 1;  // acquire',                  phase: 'acquire', isComment: false },
    { code: '',                                       phase: null,      isComment: false },
    { code: '// ── Critical Section ───────────────', phase: null,      isComment: true },
    { code: '  execute_critical_section();',          phase: 'in_cs',   isComment: false },
    { code: '',                                       phase: null,      isComment: false },
    { code: '// ── Exit Section ───────────────────', phase: null,      isComment: true },
    { code: 'sem_post(&S):',                          phase: 'release', isComment: false },
    { code: '  S += 1;  // release',                  phase: 'release', isComment: false },
    { code: '  wakeup(waitQueue.front());',           phase: 'wakeup',  isComment: false },
  ],
  Monitor: [
    { code: 'monitor CriticalSection {',             phase: null,      isComment: false },
    { code: '  bool occupied = false;',              phase: null,      isComment: false },
    { code: '  condition cond;',                     phase: null,      isComment: false },
    { code: '',                                      phase: null,      isComment: false },
    { code: '  procedure enter() {',                 phase: null,      isComment: false },
    { code: '    // Entry Section',                  phase: null,      isComment: true  },
    { code: '    while (occupied)',                   phase: 'blocked', isComment: false },
    { code: '      wait(cond); // block here',        phase: 'blocked', isComment: false },
    { code: '    occupied = true; // acquire',        phase: 'acquire', isComment: false },
    { code: '',                                      phase: null,      isComment: false },
    { code: '    // Critical Section',               phase: null,      isComment: true  },
    { code: '    execute_cs();',                     phase: 'in_cs',   isComment: false },
    { code: '',                                      phase: null,      isComment: false },
    { code: '    // Exit Section',                   phase: null,      isComment: true  },
    { code: '    occupied = false;',                 phase: 'exit',    isComment: false },
    { code: '    notifyAll(cond); // wake waiters',  phase: 'wakeup',  isComment: false },
    { code: '  }',                                   phase: 'release', isComment: false },
    { code: '}',                                     phase: null,      isComment: false },
  ],
};

// ─── Default State ────────────────────────────────────────────────────────────
function buildDefaultState(mechanism = 'Mutex', capacity = 1) {
  const sv = mechanism === 'CountingSemaphore' ? capacity : 1;
  return {
    mechanism,
    capacity: mechanism === 'CountingSemaphore' ? capacity : 1,
    semaphoreValue: sv,
    threads: [],
    waitQueue: [],
    csOccupants: [],
    isRunning: false,
    isPaused: false,
    speed: 1,
    nextId: 1,
    highlightPhase: 'idle',
    logs: [],
    autoSpawn: false,
    autoSpawnInterval: 5, // ticks between auto-spawns
    ticksSinceSpawn: 0,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useSyncStore = create((set, get) => ({
  ...buildDefaultState(),

  setMechanism: (m) => {
    const { threads } = get();
    if (threads.length > 0) return; // lock during sim
    const cap = m === 'CountingSemaphore' ? get().capacity : 1;
    set({ mechanism: m, capacity: cap, semaphoreValue: cap });
  },

  setCapacity: (n) => {
    const { threads, mechanism } = get();
    if (threads.length > 0 || mechanism !== 'CountingSemaphore') return;
    const c = Math.max(1, Math.min(8, n));
    set({ capacity: c, semaphoreValue: c });
  },

  setSpeed: (s) => set({ speed: s }),
  setAutoSpawn: (v) => set({ autoSpawn: v }),

  play: () => set({ isRunning: true, isPaused: false }),
  pause: () => set({ isRunning: false, isPaused: true }),

  reset: () => {
    const { mechanism, capacity } = get();
    _lid = 0;
    set(buildDefaultState(mechanism, capacity));
  },

  spawnThread: () => {
    const {
      nextId, threads, waitQueue, csOccupants,
      semaphoreValue, mechanism, capacity, logs,
    } = get();

    const id = `T${nextId}`;
    const color = THREAD_COLORS[(nextId - 1) % THREAD_COLORS.length];
    const newLogs = [];
    let newSV = semaphoreValue;
    let newState, newPhase;
    let newWQ = [...waitQueue];
    let newCS = [...csOccupants];

    if (semaphoreValue > 0) {
      newSV--;
      newState = 'IN_CS';
      newPhase = 'in_cs';
      newCS = [...csOccupants, id];
      newLogs.push(mkLog(
        `${id} acquired ${mechanism === 'Mutex' ? 'mutex' : mechanism === 'Monitor' ? 'monitor' : 'semaphore'} → entered CS (S=${newSV})`
      ));
    } else {
      newState = 'WAITING';
      newPhase = 'waiting';
      newWQ = [...waitQueue, id];
      newLogs.push(mkLog(
        `${id} blocked (S=${semaphoreValue}) → joined wait queue [pos ${newWQ.length}]`
      ));
    }

    const thread = {
      id,
      numericId: nextId,
      state: newState,
      phase: newPhase,
      color,
      csTimeRemaining: randInt(4, 12),
      csTotalTime: 0, // will be set properly
      exitTimer: 0,
      spawnedAt: Date.now(),
    };
    thread.csTotalTime = thread.csTimeRemaining;

    set({
      nextId: nextId + 1,
      threads: [...threads, thread],
      semaphoreValue: newSV,
      waitQueue: newWQ,
      csOccupants: newCS,
      highlightPhase: newState === 'IN_CS' ? 'acquire' : 'blocked',
      logs: [...logs, ...newLogs].slice(-80),
      ticksSinceSpawn: 0,
    });
  },

  step: () => get()._tick(),

  // ── Core tick ────────────────────────────────────────────────────────────────
  _tick: () => {
    const {
      threads, waitQueue, csOccupants, semaphoreValue,
      capacity, mechanism, logs, autoSpawn, autoSpawnInterval, ticksSinceSpawn,
    } = get();

    let newThreads = threads.map(t => ({ ...t }));
    let newWQ = [...waitQueue];
    let newCS = [...csOccupants];
    let newSV = semaphoreValue;
    const newLogs = [];
    let newHighlight = 'in_cs';
    let newTicksSince = ticksSinceSpawn + 1;

    // ── 1. Process EXITING threads (exitTimer countdown) ──────────────────────
    for (const t of newThreads) {
      if (t.state !== 'EXITING') continue;
      t.exitTimer--;
      if (t.exitTimer <= 0) {
        t.state = 'DONE';
        t.phase = 'done';
      }
    }

    // ── 2. Tick CS timers ─────────────────────────────────────────────────────
    for (const tid of [...newCS]) {
      const t = newThreads.find(th => th.id === tid);
      if (!t || t.state !== 'IN_CS') continue;

      t.csTimeRemaining = Math.max(0, t.csTimeRemaining - 1);

      if (t.csTimeRemaining <= 0) {
        t.state = 'EXITING';
        t.phase = 'exiting';
        t.exitTimer = 3;
        newCS = newCS.filter(id => id !== tid);
        newLogs.push(mkLog(`${tid}: finished CS → releasing lock`));

        // Release: wake up or increment S
        if (newWQ.length > 0) {
          const wakeId = newWQ.shift();
          const wakeT = newThreads.find(th => th.id === wakeId);
          if (wakeT) {
            const csDur = randInt(4, 12);
            wakeT.state = 'IN_CS';
            wakeT.phase = 'in_cs';
            wakeT.csTimeRemaining = csDur;
            wakeT.csTotalTime = csDur;
            newCS.push(wakeId);
            newLogs.push(mkLog(`${tid}: signaled → ${wakeId} woke from queue, entered CS (S=${newSV})`));
            newHighlight = 'wakeup';
          }
        } else {
          newSV = Math.min(newSV + 1, capacity);
          newLogs.push(mkLog(`${tid}: released (S=${newSV})`));
          newHighlight = 'release';
        }
      }
    }

    // ── 3. Remove DONE threads ────────────────────────────────────────────────
    const cleanedThreads = newThreads.filter(t => t.state !== 'DONE');

    // ── 4. Auto-spawn ─────────────────────────────────────────────────────────
    let finalState = {
      threads: cleanedThreads,
      waitQueue: newWQ,
      csOccupants: newCS,
      semaphoreValue: newSV,
      highlightPhase: newHighlight,
      logs: [...logs, ...newLogs].slice(-80),
      ticksSinceSpawn: newTicksSince,
    };

    set(finalState);

    // Auto-spawn after state update
    if (autoSpawn && newTicksSince >= autoSpawnInterval) {
      get().spawnThread();
    }
  },
}));
