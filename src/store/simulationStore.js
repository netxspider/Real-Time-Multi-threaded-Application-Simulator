// src/store/simulationStore.js
import { create } from 'zustand';
import { getKernelCount, buildMappings } from '../engine/threadModel';
import { fcfs, roundRobin, sjf } from '../engine/scheduler';

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
  return Math.floor(Math.random() * 10) + 1; // 1–10
}

// Build default thread config entries
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

// ─────────────────────────────────────────────
//  Build initial thread list from configs
// ─────────────────────────────────────────────
function buildUserThreads(configs) {
  return configs.map((cfg, i) => ({
    id: cfg.id,
    type: 'USER',
    state: 'NEW',
    arrivalTime: cfg.arrivalTime,
    burstTime: cfg.burstTime,
    remainingTime: 0,
    mappedTo: null,
    blockedBy: null,
    priority: randomPriority(),
    totalRunTime: 0,
    blockedTimer: 0,
    color: `hsl(${(i * 47) % 360}, 70%, 60%)`,
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
//  Default config
// ─────────────────────────────────────────────
const INITIAL_THREAD_COUNT = 5;
const INITIAL_CONFIGS = buildDefaultConfigs(INITIAL_THREAD_COUNT);

const DEFAULT_CONFIG = {
  numUserThreads: INITIAL_THREAD_COUNT,
  threadConfigs: INITIAL_CONFIGS,
  model: 'One-to-One',
  algorithm: 'Round Robin',
  timeQuantum: 4,
  speed: 1, // ticks per second
};

const DEFAULT_SIM = {
  time: 0,
  isRunning: false,
  isPaused: false,
  simulationCompleted: false,
  userThreads: [],
  kernelThreads: [],
  mappings: {},
  readyQueue: [],
  blockedQueue: [],
  ganttEntries: [],
  cpuUtilHistory: [],
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

  // ── Thread config editing ────────────────────
  setThreadConfigs: (configs) => set({ threadConfigs: configs }),

  updateThreadConfig: (id, field, value) => {
    set((s) => ({
      threadConfigs: s.threadConfigs.map((cfg) =>
        cfg.id === id ? { ...cfg, [field]: value } : cfg
      ),
    }));
  },

  // ── Derived getters ─────────────────────────
  getKernelCount: () => {
    const { model, numUserThreads } = get();
    return getKernelCount(model, numUserThreads);
  },

  // ── Create threads (called before sim start) ─
  createSimulation: () => {
    const { numUserThreads, model, threadConfigs, timeQuantum } = get();
    const kCount = getKernelCount(model, numUserThreads);
    // Use the user-defined configs (arrival & burst)
    const configs = threadConfigs.slice(0, numUserThreads);
    const userThreads = buildUserThreads(configs);
    const kernelThreads = buildKernelThreads(kCount);
    const mappings = buildMappings(model, userThreads, kernelThreads);

    set({
      ...DEFAULT_SIM,
      userThreads,
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
    set({
      ...DEFAULT_SIM,
      eventLogs: [makeLog('Simulation RESET.')],
    });
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
      cpuCurrentThread, algorithm, timeQuantum, model,
    } = state;

    const newTime = time + 1;
    const newLogs = [];
    let newThreads = userThreads.map(t => ({ ...t }));
    let newReadyQueue = [...readyQueue];
    let newBlockedQueue = [...blockedQueue];
    let newQuantum = quantumRemaining;
    let newCpuThread = cpuCurrentThread;
    let newGantt = [...ganttEntries];
    let newKernelThreads = kernelThreads.map(k => ({ ...k }));

    // 1. Admit NEW threads whose arrival time has come
    for (const t of newThreads) {
      if (t.state === 'NEW' && t.arrivalTime <= newTime) {
        t.state = 'READY';
        t.remainingTime = t.burstTime;
        if (!newReadyQueue.includes(t.id)) newReadyQueue.push(t.id);
        newLogs.push(makeLog(`${t.id} → READY (arrived at t=${newTime})`));
      }
    }

    // 2. Unblock threads whose block timer expired
    for (const t of newThreads) {
      if (t.state === 'BLOCKED') {
        t.blockedTimer -= 1;
        if (t.blockedTimer <= 0) {
          t.state = 'READY';
          t.blockedBy = null;
          newBlockedQueue = newBlockedQueue.filter(id => id !== t.id);
          if (!newReadyQueue.includes(t.id)) newReadyQueue.push(t.id);
          newLogs.push(makeLog(`${t.id} UNBLOCKED → READY`));
        }
      }
    }

    // 3. Scheduling — pick next thread to run
    let chosenId = null;
    if (algorithm === 'FCFS') {
      chosenId = fcfs(newReadyQueue);
    } else if (algorithm === 'Round Robin') {
      const { nextId, shouldPreempt } = roundRobin(newReadyQueue, newThreads, newQuantum);
      if (shouldPreempt && newCpuThread) {
        const preempted = newThreads.find(t => t.id === newCpuThread);
        if (preempted && preempted.state === 'RUNNING') {
          preempted.state = 'READY';
          newReadyQueue = newReadyQueue.filter(id => id !== preempted.id);
          newReadyQueue.push(preempted.id);
          newLogs.push(makeLog(`${preempted.id} preempted (quantum expired) → READY`));
        }
        newQuantum = timeQuantum;
        newCpuThread = null;
      }
      chosenId = newReadyQueue[0] ?? null;
    } else if (algorithm === 'SJF') {
      chosenId = sjf(newReadyQueue, newThreads);
    }

    // 4. Run the chosen thread
    const prevCpuThread = newCpuThread;
    if (chosenId) {
      const running = newThreads.find(t => t.id === chosenId);
      if (running) {
        if (newCpuThread !== chosenId) {
          newLogs.push(makeLog(`${chosenId} → RUNNING on CPU`));
        }
        newCpuThread = chosenId;
        running.state = 'RUNNING';
        running.remainingTime = Math.max(0, running.remainingTime - 1);
        running.totalRunTime += 1;
        newReadyQueue = newReadyQueue.filter(id => id !== chosenId);
        if (algorithm === 'Round Robin') newQuantum -= 1;
        const kernelId = mappings[chosenId];
        for (const k of newKernelThreads) {
          if (k.id === kernelId) k.currentUserThread = chosenId;
          else if (k.currentUserThread === chosenId) k.currentUserThread = null;
        }

        const lastEntry = newGantt[newGantt.length - 1];
        if (lastEntry && lastEntry.threadId === chosenId && lastEntry.end === newTime - 1) {
          newGantt[newGantt.length - 1] = { ...lastEntry, end: newTime };
        } else {
          newGantt.push({ threadId: chosenId, start: newTime - 1, end: newTime, color: running.color });
        }

        // Random blocking (8% chance per tick)

        if (running.remainingTime > 1 && Math.random() < 0.08) {
          running.state = 'BLOCKED';
          running.blockedBy = `S${Math.floor(Math.random() * 3) + 1}`;
          running.blockedTimer = Math.floor(Math.random() * 6) + 3;
          newBlockedQueue.push(running.id);
          newCpuThread = null;
          const kernelId2 = mappings[running.id];
          for (const k of newKernelThreads) {
            if (k.id === kernelId2) k.currentUserThread = null;
          }
          newLogs.push(makeLog(`${running.id} BLOCKED (waiting ${running.blockedBy}) for ${running.blockedTimer} ticks`));
        }

        // Thread completes
        if (running.remainingTime <= 0 && running.state !== 'BLOCKED') {
          running.state = 'TERMINATED';
          newCpuThread = null;
          const kernelId3 = mappings[running.id];
          for (const k of newKernelThreads) {
            if (k.id === kernelId3) k.currentUserThread = null;
          }
          newLogs.push(makeLog(`${running.id} TERMINATED (burst done)`));
          if (algorithm === 'Round Robin') newQuantum = timeQuantum;
        }
      }
    } else {
      newCpuThread = null;
    }

    // 5. CPU utilization
    const utilized = chosenId ? 1 : 0;
    const recentUtil = [
      ...cpuUtilHistory.slice(-29),
      { t: newTime, util: utilized ? 100 : 0 },
    ];

    const window30 = recentUtil.slice(-30);
    const avg = Math.round(window30.reduce((s, e) => s + e.util, 0) / window30.length);
    const newCpuHistory = [...cpuUtilHistory.slice(-59), { t: newTime, util: avg }];

    // 6. Check if all done
    const allDone = newThreads.every(t => t.state === 'TERMINATED');
    if (allDone) {
      newLogs.push(makeLog('All threads TERMINATED. Simulation complete.'));
    }

    // 7. Commit state
    set({
      time: newTime,
      isRunning: allDone ? false : true,
      isPaused: false,
      simulationCompleted: allDone ? true : false,
      userThreads: newThreads,
      kernelThreads: newKernelThreads,
      readyQueue: newReadyQueue,
      blockedQueue: newBlockedQueue,
      ganttEntries: newGantt,
      cpuUtilHistory: newCpuHistory,
      eventLogs: [...eventLogs, ...newLogs].slice(-200),
      quantumRemaining: newQuantum,
      cpuCurrentThread: newCpuThread,
      completedCount: newThreads.filter(t => t.state === 'TERMINATED').length,
    });
  },
}));
