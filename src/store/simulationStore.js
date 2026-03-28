// src/store/simulationStore.js
import { create } from 'zustand';
import { getKernelCount, buildMappings } from '../engine/threadModel';
import { fcfs, sjf, srtf, prioritySchedule } from '../engine/scheduler';

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
let _logIdCounter = 0;
function makeLog(msg) {
  const now = new Date();
  const ts = now.toLocaleTimeString('en-US', { hour12: false });
  return { id: ++_logIdCounter, text: `[${ts}] ${msg}` };
}

// Build default thread config entries (with optional priority)
function buildDefaultConfigs(count, existingConfigs = []) {
  return Array.from({ length: count }, (_, i) => {
    const existing = existingConfigs[i];
    return {
      id: `T${i + 1}`,
      arrivalTime: existing?.arrivalTime ?? 0,
      burstTime:   existing?.burstTime   ?? 5,
      priority:    existing?.priority    ?? (i + 1), // default: 1,2,3... (lower = higher by default)
    };
  });
}

// Build runtime thread objects from config
function buildUserThreads(configs) {
  return configs.map((cfg, i) => ({
    id: cfg.id,
    type: 'USER',
    state: 'NEW',
    arrivalTime:   cfg.arrivalTime,
    burstTime:     cfg.burstTime,
    remainingTime: cfg.burstTime,  // decremented each tick while RUNNING
    priority:      cfg.priority ?? (i + 1),
    mappedTo:      null,
    totalRunTime:  0,
    color: `hsl(${(i * 47) % 360}, 70%, 60%)`,
    // Scheduling metrics
    startTime:      null,
    completionTime: null,
    waitingTime:    0,
    responseTime:   null,
  }));
}

function buildKernelThreads(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `K${i + 1}`,
    type: 'KERNEL',
    state: 'READY',
    currentUserThread: null,
  }));
}

// ─────────────────────────────────────────────
//  Defaults
// ─────────────────────────────────────────────
const INITIAL_THREAD_COUNT = 5;
const INITIAL_CONFIGS = buildDefaultConfigs(INITIAL_THREAD_COUNT);

const DEFAULT_CONFIG = {
  numUserThreads: INITIAL_THREAD_COUNT,
  threadConfigs:  INITIAL_CONFIGS,
  model:          'One-to-One',
  algorithm:      'Round Robin',
  timeQuantum:    4,
  speed:          1,
  // Priority scheduling options
  // 'lowest'  → smallest priority number wins (default, e.g. priority 1 > priority 5)
  // 'highest' → largest priority number wins  (e.g. priority 10 > priority 1)
  priorityMode:   'lowest',
};

const DEFAULT_SIM = {
  time:                0,
  isRunning:           false,
  isPaused:            false,
  simulationCompleted: false,
  userThreads:         [],
  kernelThreads:       [],
  mappings:            {},
  readyQueue:          [],       // thread IDs waiting for CPU
  ganttEntries:        [],       // { threadId, start, end, color }
  cpuUtilHistory:      [],       // { t, util }
  eventLogs:           [],
  quantumRemaining:    0,
  cpuCurrentThread:    null,
  completedCount:      0,
  contextSwitches:     0,
};

// ─────────────────────────────────────────────
//  Store
// ─────────────────────────────────────────────
export const useSimStore = create((set, get) => ({
  ...DEFAULT_CONFIG,
  ...DEFAULT_SIM,

  // ── Config setters ──────────────────────────
  setNumUserThreads: (n) => {
    const clamped = Math.max(1, Math.min(10, n));
    set((s) => ({
      numUserThreads: clamped,
      threadConfigs: buildDefaultConfigs(clamped, s.threadConfigs),
    }));
  },
  setModel:        (m) => set({ model: m }),
  setAlgorithm:    (a) => set({ algorithm: a }),
  setTimeQuantum:  (q) => set({ timeQuantum: q }),
  setSpeed:        (s) => set({ speed: s }),
  setPriorityMode: (m) => set({ priorityMode: m }),

  setThreadConfigs:    (configs) => set({ threadConfigs: configs }),
  updateThreadConfig: (id, field, value) => {
    set((s) => ({
      threadConfigs: s.threadConfigs.map((cfg) =>
        cfg.id === id ? { ...cfg, [field]: value } : cfg
      ),
    }));
  },

  getKernelCount: () => {
    const { model, numUserThreads } = get();
    return getKernelCount(model, numUserThreads);
  },

  // ── Create threads ───────────────────────────
  createSimulation: () => {
    const { numUserThreads, model, threadConfigs, timeQuantum } = get();
    const kCount       = getKernelCount(model, numUserThreads);
    const configs      = threadConfigs.slice(0, numUserThreads);
    const userThreads  = buildUserThreads(configs);
    const kernelThreads = buildKernelThreads(kCount);
    const mappings     = buildMappings(model, userThreads, kernelThreads);

    const userThreadsWithMapping = userThreads.map(t => ({
      ...t,
      mappedTo: mappings[t.id] ?? null,
    }));

    set({
      ...DEFAULT_SIM,
      userThreads: userThreadsWithMapping,
      kernelThreads,
      mappings,
      quantumRemaining: timeQuantum,
      eventLogs: [makeLog('Simulation created. Threads in Job Queue (NEW).')],
    });
  },

  // ── Playback controls ────────────────────────
  startSim: () => {
    const { userThreads } = get();
    if (userThreads.length === 0) get().createSimulation();
    set((s) => ({
      isRunning:           true,
      isPaused:            false,
      simulationCompleted: false,
      eventLogs: [...s.eventLogs, makeLog('Simulation STARTED.')],
    }));
  },

  pauseSim: () => {
    set((s) => ({
      isPaused:  true,
      isRunning: false,
      eventLogs: [...s.eventLogs, makeLog('Simulation PAUSED.')],
    }));
  },

  resumeSim: () => {
    set((s) => ({
      isPaused:  false,
      isRunning: true,
      eventLogs: [...s.eventLogs, makeLog('Simulation RESUMED.')],
    }));
  },

  resetSim: () => {
    set({ ...DEFAULT_SIM, eventLogs: [makeLog('Simulation RESET.')] });
  },

  stopSim: () => {
    set((s) => ({
      isRunning: false,
      isPaused:  false,
      eventLogs: [...s.eventLogs, makeLog('Simulation STOPPED.')],
    }));
  },

  // ─────────────────────────────────────────────────────────────────────────────
  //  tick() — advances simulation by 1 time unit
  //
  //  Algorithm behaviour summary:
  //  ┌──────────────────┬───────────────┬──────────────────────────────────────┐
  //  │ Algorithm        │ Preemptive?   │ Selection criteria                   │
  //  ├──────────────────┼───────────────┼──────────────────────────────────────┤
  //  │ FCFS             │ No            │ First in ready queue (arrival order) │
  //  │ Round Robin      │ Yes (quantum) │ FIFO, rotate after timeQuantum ticks │
  //  │ SJF              │ No            │ Shortest burst time in ready queue   │
  //  │ SRTF             │ Yes           │ Shortest remaining time (all pools)  │
  //  │ Priority         │ Yes           │ Best priority (lowest or highest)    │
  //  └──────────────────┴───────────────┴──────────────────────────────────────┘
  //
  //  No blocking: threads only move NEW → READY → RUNNING → TERMINATED.
  // ─────────────────────────────────────────────────────────────────────────────
  tick: () => {
    const state = get();
    const {
      time, userThreads, kernelThreads, mappings,
      readyQueue, ganttEntries, cpuUtilHistory,
      eventLogs, quantumRemaining, cpuCurrentThread,
      algorithm, timeQuantum, priorityMode, contextSwitches,
    } = state;

    const newTime = time + 1;
    const newLogs      = [];
    let threads        = userThreads.map(t => ({ ...t }));
    let rq             = [...readyQueue];
    let quantum        = quantumRemaining;
    let cpuThread      = cpuCurrentThread;
    let gantt          = [...ganttEntries];
    let kThreads       = kernelThreads.map(k => ({ ...k }));
    let ctxSwitches    = contextSwitches;

    // ── 1. Admit NEW threads whose arrival time ≤ current time ───────────────
    for (const t of threads) {
      if (t.state === 'NEW' && t.arrivalTime <= time) {
        t.state = 'READY';
        if (!rq.includes(t.id)) rq.push(t.id);
        newLogs.push(makeLog(`${t.id} → READY (arrived t=${t.arrivalTime}, burst=${t.burstTime}${algorithm === 'Priority' ? `, pri=${t.priority}` : ''})`));
      }
    }

    // ── 2. Round Robin: handle quantum expiry → preempt running thread ────────
    if (algorithm === 'Round Robin' && cpuThread !== null && quantum <= 0) {
      const preempted = threads.find(t => t.id === cpuThread && t.state === 'RUNNING');
      if (preempted) {
        preempted.state = 'READY';
        rq.push(preempted.id);  // rotate to back
        newLogs.push(makeLog(`${preempted.id} preempted — quantum expired → back of queue`));
      }
      quantum   = timeQuantum;
      cpuThread = null;
    }

    // ── 3. Pick the thread that should be on CPU this tick ────────────────────
    let chosenId = null;

    if (algorithm === 'FCFS') {
      // Non-preemptive: keep current running thread
      if (cpuThread && threads.find(t => t.id === cpuThread && t.state === 'RUNNING')) {
        chosenId = cpuThread;
      } else {
        chosenId = fcfs(rq);
      }

    } else if (algorithm === 'Round Robin') {
      // Preemptive (via quantum): cpuThread was cleared above if expired
      if (cpuThread && threads.find(t => t.id === cpuThread && t.state === 'RUNNING')) {
        chosenId = cpuThread;  // still has quantum left
      } else {
        chosenId = rq.length > 0 ? rq[0] : null;
      }

    } else if (algorithm === 'SJF') {
      // Non-preemptive: keep current running thread
      if (cpuThread && threads.find(t => t.id === cpuThread && t.state === 'RUNNING')) {
        chosenId = cpuThread;
      } else {
        chosenId = sjf(rq, threads);
      }

    } else if (algorithm === 'SRTF') {
      // Preemptive SJF: always pick shortest remaining from ready+running pool
      chosenId = srtf(rq, threads, cpuThread);
      // If chosen differs from current CPU thread, preempt it
      if (chosenId !== cpuThread && cpuThread !== null) {
        const preempted = threads.find(t => t.id === cpuThread && t.state === 'RUNNING');
        if (preempted) {
          preempted.state = 'READY';
          if (!rq.includes(cpuThread)) rq.push(cpuThread);
          newLogs.push(makeLog(`${cpuThread} preempted by ${chosenId} (shorter remaining time)`));
        }
        cpuThread = null;
      }

    } else if (algorithm === 'Priority') {
      // Preemptive Priority: always pick best priority from ready+running pool
      chosenId = prioritySchedule(rq, threads, priorityMode, cpuThread);
      // Preempt if a better-priority thread is available
      if (chosenId !== cpuThread && cpuThread !== null) {
        const preempted = threads.find(t => t.id === cpuThread && t.state === 'RUNNING');
        if (preempted) {
          preempted.state = 'READY';
          if (!rq.includes(cpuThread)) rq.push(cpuThread);
          const dir = priorityMode === 'lowest' ? 'lower' : 'higher';
          newLogs.push(makeLog(`${cpuThread} preempted by ${chosenId} (${dir} priority number)`));
        }
        cpuThread = null;
      }
    }

    // ── 4. Execute the chosen thread ──────────────────────────────────────────
    const prevCpuThread = cpuThread;

    if (chosenId !== null) {
      const running = threads.find(t => t.id === chosenId);
      if (running) {
        // Context switch log
        if (prevCpuThread !== chosenId) {
          ctxSwitches += 1;
          if (prevCpuThread) {
            newLogs.push(makeLog(`Context switch: ${prevCpuThread} → ${chosenId}`));
          } else {
            newLogs.push(makeLog(`${chosenId} → RUNNING on CPU`));
          }
        }

        cpuThread      = chosenId;
        running.state  = 'RUNNING';

        if (running.responseTime === null) running.responseTime = time;
        if (running.startTime    === null) running.startTime    = time;

        // Remove from ready queue
        rq = rq.filter(id => id !== chosenId);

        // Decrement burst
        running.remainingTime -= 1;
        running.totalRunTime  += 1;

        if (algorithm === 'Round Robin') quantum -= 1;

        // Update kernel mapping
        const kernelId = mappings[chosenId];
        for (const k of kThreads) {
          if (k.id === kernelId) k.currentUserThread = chosenId;
          else if (k.currentUserThread === chosenId) k.currentUserThread = null;
        }

        // Gantt: extend existing slot or open new one
        const lastSlot = gantt[gantt.length - 1];
        if (lastSlot && lastSlot.threadId === chosenId && lastSlot.end === time) {
          gantt[gantt.length - 1] = { ...lastSlot, end: newTime };
        } else {
          gantt.push({ threadId: chosenId, start: time, end: newTime, color: running.color });
        }

        // Termination
        if (running.remainingTime <= 0) {
          running.remainingTime  = 0;
          running.state          = 'TERMINATED';
          running.completionTime = newTime;
          cpuThread              = null;
          quantum                = timeQuantum;
          const kId = mappings[running.id];
          for (const k of kThreads) {
            if (k.id === kId) k.currentUserThread = null;
          }
          newLogs.push(makeLog(`${running.id} TERMINATED at t=${newTime}`));
        }
      }
    } else {
      cpuThread = null;
    }

    // ── 5. Accumulate waiting time for READY threads ──────────────────────────
    for (const t of threads) {
      if (t.state === 'READY') t.waitingTime = (t.waitingTime || 0) + 1;
    }

    // ── 6. CPU utilization ────────────────────────────────────────────────────
    const isActive = cpuThread !== null || (chosenId !== null && threads.find(t => t.id === chosenId)?.state !== 'TERMINATED');
    const newCpuHistory = [
      ...cpuUtilHistory.slice(-59),
      { t: newTime, util: isActive ? 100 : 0 },
    ];

    // ── 7. Completion check ───────────────────────────────────────────────────
    const hasPending = threads.some(t => t.state === 'NEW' || t.state === 'READY' || t.state === 'RUNNING');
    const allDone    = threads.length > 0 && !hasPending;
    if (allDone) {
      newLogs.push(makeLog(`All threads TERMINATED. Simulation complete. Context switches: ${ctxSwitches}`));
    }

    // ── 8. Final cpuCurrentThread value ──────────────────────────────────────
    // Only set if the chosen thread is still alive (not just terminated)
    const finalCpuThread = cpuThread !== null
      ? cpuThread
      : (chosenId && threads.find(t => t.id === chosenId)?.state === 'RUNNING' ? chosenId : null);

    // ── 9. Commit ─────────────────────────────────────────────────────────────
    set({
      time:                newTime,
      isRunning:           allDone ? false : true,
      isPaused:            false,
      simulationCompleted: allDone,
      userThreads:         threads,
      kernelThreads:       kThreads,
      readyQueue:          rq,
      ganttEntries:        gantt,
      cpuUtilHistory:      newCpuHistory,
      eventLogs:           [...eventLogs, ...newLogs].slice(-200),
      quantumRemaining:    quantum,
      cpuCurrentThread:    finalCpuThread,
      completedCount:      threads.filter(t => t.state === 'TERMINATED').length,
      contextSwitches:     ctxSwitches,
    });
  },
}));
