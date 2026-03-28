// src/store/simulationStore.js
import { create } from 'zustand';
import { getKernelCount, buildMappings } from '../engine/threadModel';
import { fcfs, sjf } from '../engine/scheduler';

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
let _logIdCounter = 0;
function makeLog(msg) {
  const now = new Date();
  const ts = now.toLocaleTimeString('en-US', { hour12: false });
  return { id: ++_logIdCounter, text: `[${ts}] ${msg}` };
}

function randomPriority() {
  return Math.floor(Math.random() * 10) + 1;
}

function buildDefaultConfigs(count, existingConfigs = []) {
  return Array.from({ length: count }, (_, i) => {
    const existing = existingConfigs[i];
    return {
      id: `T${i + 1}`,
      arrivalTime: existing?.arrivalTime ?? 0,
      burstTime: existing?.burstTime ?? 5,
    };
  });
}

function buildUserThreads(configs) {
  return configs.map((cfg, i) => ({
    id: cfg.id,
    type: 'USER',
    state: 'NEW',
    arrivalTime: cfg.arrivalTime,
    burstTime: cfg.burstTime,
    remainingTime: cfg.burstTime, // initialize to burstTime — decremented when RUNNING
    mappedTo: null,
    blockedBy: null,
    priority: randomPriority(),
    totalRunTime: 0,
    blockedTimer: 0,
    color: `hsl(${(i * 47) % 360}, 70%, 60%)`,
    // Scheduling metrics
    startTime: null,
    completionTime: null,
    waitingTime: 0,
    responseTime: null,
    // Track whether this thread has ever entered the ready queue
    everReady: false,
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
  threadConfigs: INITIAL_CONFIGS,
  model: 'One-to-One',
  algorithm: 'Round Robin',
  timeQuantum: 4,
  speed: 1,
};

const DEFAULT_SIM = {
  time: 0,
  isRunning: false,
  isPaused: false,
  simulationCompleted: false,
  userThreads: [],
  kernelThreads: [],
  mappings: {},
  readyQueue: [],        // thread IDs waiting for CPU
  blockedQueue: [],      // thread IDs blocked on semaphore
  ganttEntries: [],      // { threadId, start, end, color }
  cpuUtilHistory: [],    // { t, util }
  eventLogs: [],
  quantumRemaining: 0,
  cpuCurrentThread: null,
  completedCount: 0,
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
  setModel: (m) => set({ model: m }),
  setAlgorithm: (a) => set({ algorithm: a }),
  setTimeQuantum: (q) => set({ timeQuantum: q }),
  setSpeed: (s) => set({ speed: s }),
  setThreadConfigs: (configs) => set({ threadConfigs: configs }),
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
    const kCount = getKernelCount(model, numUserThreads);
    const configs = threadConfigs.slice(0, numUserThreads);
    const userThreads = buildUserThreads(configs);
    const kernelThreads = buildKernelThreads(kCount);
    const mappings = buildMappings(model, userThreads, kernelThreads);

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
      isRunning: true,
      isPaused: false,
      simulationCompleted: false,
      eventLogs: [...s.eventLogs, makeLog('Simulation STARTED.')],
    }));
  },

  pauseSim: () => {
    set((s) => ({
      isPaused: true,
      isRunning: false,
      eventLogs: [...s.eventLogs, makeLog('Simulation PAUSED.')],
    }));
  },

  resumeSim: () => {
    set((s) => ({
      isPaused: false,
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
      isPaused: false,
      eventLogs: [...s.eventLogs, makeLog('Simulation STOPPED.')],
    }));
  },

  // ── Main tick ────────────────────────────────
  tick: () => {
    const state = get();
    const {
      time, userThreads, kernelThreads, mappings,
      readyQueue, blockedQueue, ganttEntries,
      cpuUtilHistory, eventLogs, quantumRemaining,
      cpuCurrentThread, algorithm, timeQuantum,
    } = state;

    const newTime = time + 1;
    const newLogs = [];
    let threads = userThreads.map(t => ({ ...t }));
    let rq = [...readyQueue];
    let bq = [...blockedQueue];
    let quantum = quantumRemaining;
    let cpuThread = cpuCurrentThread;
    let gantt = [...ganttEntries];
    let kThreads = kernelThreads.map(k => ({ ...k }));

    // ── Step 1: Admit NEW threads that have arrived ──────────────────────────
    // Check arrivalTime <= time (before this tick's work begins at newTime)
    for (const t of threads) {
      if (t.state === 'NEW' && t.arrivalTime <= time) {
        t.state = 'READY';
        t.everReady = true;
        // remainingTime was already initialized to burstTime in buildUserThreads
        if (!rq.includes(t.id)) rq.push(t.id);
        newLogs.push(makeLog(`${t.id} → READY (arrived at t=${t.arrivalTime})`));
      }
    }

    // ── Step 2: Unblock threads whose block timer expired ────────────────────
    for (const t of threads) {
      if (t.state === 'BLOCKED') {
        t.blockedTimer -= 1;
        if (t.blockedTimer <= 0) {
          t.state = 'READY';
          t.blockedBy = null;
          bq = bq.filter(id => id !== t.id);
          if (!rq.includes(t.id)) rq.push(t.id);
          newLogs.push(makeLog(`${t.id} UNBLOCKED → READY`));
        }
      }
    }

    // ── Step 3: Handle Round Robin quantum expiry (preemption) ───────────────
    // If the current running thread's quantum ran out, send it back to ready queue
    if (algorithm === 'Round Robin' && quantum <= 0 && cpuThread) {
      const preempted = threads.find(t => t.id === cpuThread);
      if (preempted && preempted.state === 'RUNNING') {
        preempted.state = 'READY';
        rq = rq.filter(id => id !== preempted.id);
        rq.push(preempted.id); // go to back of queue
        newLogs.push(makeLog(`${preempted.id} preempted (quantum expired) → READY`));
      }
      quantum = timeQuantum;
      cpuThread = null;
    }

    // ── Step 4: Pick next thread to run ─────────────────────────────────────
    // For FCFS / SJF: if there is already a running thread, keep it (non-preemptive)
    let chosenId = null;

    if (algorithm === 'FCFS') {
      // Non-preemptive: keep running thread if it's still running
      if (cpuThread && threads.find(t => t.id === cpuThread && t.state === 'RUNNING')) {
        chosenId = cpuThread;
      } else {
        chosenId = fcfs(rq);
      }
    } else if (algorithm === 'Round Robin') {
      // Preemptive based on quantum (handled above); just pick head of queue
      chosenId = rq[0] ?? null;
    } else if (algorithm === 'SJF') {
      // Non-preemptive SJF: keep running thread until it completes or blocks
      if (cpuThread && threads.find(t => t.id === cpuThread && t.state === 'RUNNING')) {
        chosenId = cpuThread;
      } else {
        chosenId = sjf(rq, threads);
      }
    }

    // ── Step 5: Execute chosen thread ───────────────────────────────────────
    if (chosenId) {
      const running = threads.find(t => t.id === chosenId);
      if (running) {
        // Context switch log
        if (cpuThread !== chosenId) {
          newLogs.push(makeLog(`${chosenId} → RUNNING on CPU`));
        }
        cpuThread = chosenId;
        running.state = 'RUNNING';

        // First response time
        if (running.responseTime === null) {
          running.responseTime = time; // time at start of this tick
        }
        if (running.startTime === null) {
          running.startTime = time;
        }

        // Decrement remaining time by 1 tick
        running.remainingTime = running.remainingTime - 1;
        running.totalRunTime += 1;

        // Remove from ready queue if it was in there
        rq = rq.filter(id => id !== chosenId);

        // Decrement quantum for RR
        if (algorithm === 'Round Robin') quantum -= 1;

        // Update kernel thread assignment
        const kernelId = mappings[chosenId];
        for (const k of kThreads) {
          if (k.id === kernelId) k.currentUserThread = chosenId;
          else if (k.currentUserThread === chosenId) k.currentUserThread = null;
        }

        // ── Gantt: extend existing entry or start new one ──────────────────
        // Each gantt entry = { threadId, start, end, color }
        // "start" and "end" are integer tick boundaries (end = start + duration)
        const lastEntry = gantt[gantt.length - 1];
        if (
          lastEntry &&
          lastEntry.threadId === chosenId &&
          lastEntry.end === time // entry ended exactly at the start of this tick
        ) {
          // Extend existing block
          gantt[gantt.length - 1] = { ...lastEntry, end: newTime };
        } else {
          // New block
          gantt.push({
            threadId: chosenId,
            start: time,
            end: newTime,
            color: running.color,
          });
        }

        // ── Termination check ──────────────────────────────────────────────
        if (running.remainingTime <= 0) {
          running.remainingTime = 0;
          running.state = 'TERMINATED';
          running.completionTime = newTime;
          cpuThread = null;
          quantum = timeQuantum; // reset quantum for next thread
          const kId = mappings[running.id];
          for (const k of kThreads) {
            if (k.id === kId) k.currentUserThread = null;
          }
          newLogs.push(makeLog(`${running.id} TERMINATED at t=${newTime} (burst complete)`));
        } else {
          // ── Random blocking: only if thread has more than 1 tick remaining ─
          if (running.remainingTime > 1 && Math.random() < 0.06) {
            running.state = 'BLOCKED';
            running.blockedBy = `S${Math.floor(Math.random() * 3) + 1}`;
            running.blockedTimer = Math.floor(Math.random() * 4) + 2;
            bq.push(running.id);
            cpuThread = null;
            if (algorithm === 'Round Robin') quantum = timeQuantum;
            const kId2 = mappings[running.id];
            for (const k of kThreads) {
              if (k.id === kId2) k.currentUserThread = null;
            }
            newLogs.push(makeLog(
              `${running.id} BLOCKED (waiting ${running.blockedBy}) for ${running.blockedTimer} ticks`
            ));
          }
        }
      }
    } else {
      cpuThread = null;
    }

    // ── Step 6: Accumulate waiting time for READY threads ───────────────────
    for (const t of threads) {
      if (t.state === 'READY') {
        t.waitingTime = (t.waitingTime || 0) + 1;
      }
    }

    // ── Step 7: CPU utilization ──────────────────────────────────────────────
    const utilized = cpuThread ? 100 : 0;
    const newCpuHistory = [
      ...cpuUtilHistory.slice(-59),
      { t: newTime, util: utilized },
    ];

    // ── Step 8: Check completion ─────────────────────────────────────────────
    // All done when every thread is TERMINATED (threads that haven't arrived
    // yet remain NEW, so we also check no NEW threads are pending)
    const allTerminated = threads.length > 0 && threads.every(t => t.state === 'TERMINATED');
    const hasPendingNew = threads.some(t => t.state === 'NEW');
    const allDone = allTerminated && !hasPendingNew;

    if (allDone) {
      newLogs.push(makeLog('All threads TERMINATED. Simulation complete.'));
    }

    // ── Step 9: Commit ───────────────────────────────────────────────────────
    set({
      time: newTime,
      isRunning: allDone ? false : true,
      isPaused: false,
      simulationCompleted: allDone,
      userThreads: threads,
      kernelThreads: kThreads,
      readyQueue: rq,
      blockedQueue: bq,
      ganttEntries: gantt,
      cpuUtilHistory: newCpuHistory,
      eventLogs: [...eventLogs, ...newLogs].slice(-200),
      quantumRemaining: quantum,
      cpuCurrentThread: cpuThread,
      completedCount: threads.filter(t => t.state === 'TERMINATED').length,
    });
  },
}));
