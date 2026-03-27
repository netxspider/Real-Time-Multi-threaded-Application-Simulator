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

function randomBurst() {
  return Math.floor(Math.random() * 18) + 3; // 3–20 ticks
}

function randomPriority() {
  return Math.floor(Math.random() * 10) + 1; // 1–10
}

function randomArrival(mode, index, total) {
  if (mode === 'Simultaneous') return 0;
  if (mode === 'Staggered') return index * 3;
  return Math.floor(Math.random() * total * 2); // Randomized
}

// ─────────────────────────────────────────────
//  Build initial thread list
// ─────────────────────────────────────────────
function buildUserThreads(count, arrivalMode) {
  return Array.from({ length: count }, (_, i) => ({
    id: `T${i + 1}`,
    type: 'USER',
    state: 'NEW',
    arrivalTime: randomArrival(arrivalMode, i, count),
    burstTime: randomBurst(),
    remainingTime: 0, // set when thread enters READY
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
const DEFAULT_CONFIG = {
  numUserThreads: 5,
  model: 'One-to-One',
  arrivalMode: 'Simultaneous',
  algorithm: 'Round Robin',
  timeQuantum: 4,
  speed: 3, // ticks per second (1–1000)
};

const DEFAULT_SIM = {
  time: 0,
  isRunning: false,
  isPaused: false,
  userThreads: [],
  kernelThreads: [],
  mappings: {},       // { userId: kernelId }
  readyQueue: [],
  blockedQueue: [],
  ganttEntries: [],   // [{ threadId, start, end, color }]
  cpuUtilHistory: [], // [{ t, util }]
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
  setNumUserThreads: (n) => set({ numUserThreads: n }),
  setModel: (m) => set({ model: m }),
  setArrivalMode: (a) => set({ arrivalMode: a }),
  setAlgorithm: (a) => set({ algorithm: a }),
  setTimeQuantum: (q) => set({ timeQuantum: q }),
  setSpeed: (s) => set({ speed: s }),

  // ── Derived getters ─────────────────────────
  getKernelCount: () => {
    const { model, numUserThreads } = get();
    return getKernelCount(model, numUserThreads);
  },

  // ── Create threads (called before sim start) ─
  createSimulation: () => {
    const { numUserThreads, model, arrivalMode, timeQuantum } = get();
    const kCount = getKernelCount(model, numUserThreads);
    const userThreads = buildUserThreads(numUserThreads, arrivalMode);
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
    const { isRunning, userThreads } = get();
    if (userThreads.length === 0) get().createSimulation();
    // Re-read after possible createSimulation
    set((s) => ({
      isRunning: true,
      isPaused: false,
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
    set((s) => ({
      ...DEFAULT_SIM,
      eventLogs: [makeLog('Simulation RESET.')],
    }));
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
        // Preempt: move current thread to back of queue
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
      // Re-pick after possible preemption
      chosenId = newReadyQueue[0] ?? null;
    } else if (algorithm === 'SJF') {
      chosenId = sjf(newReadyQueue, newThreads);
    }

    // 4. Run the chosen thread
    const prevCpuThread = newCpuThread;
    if (chosenId) {
      const running = newThreads.find(t => t.id === chosenId);
      if (running) {
        // Context switch log
        if (newCpuThread !== chosenId) {
          newLogs.push(makeLog(`${chosenId} → RUNNING on CPU`));
        }
        newCpuThread = chosenId;
        running.state = 'RUNNING';
        running.remainingTime = Math.max(0, running.remainingTime - 1);
        running.totalRunTime += 1;
        newReadyQueue = newReadyQueue.filter(id => id !== chosenId);
        if (algorithm === 'Round Robin') newQuantum -= 1;

        // Update kernel thread assignment
        const kernelId = mappings[chosenId];
        for (const k of newKernelThreads) {
          if (k.id === kernelId) k.currentUserThread = chosenId;
          else if (k.currentUserThread === chosenId) k.currentUserThread = null;
        }

        // Gantt entry
        const lastEntry = newGantt[newGantt.length - 1];
        if (lastEntry && lastEntry.threadId === chosenId && lastEntry.end === newTime - 1) {
          newGantt[newGantt.length - 1] = { ...lastEntry, end: newTime };
        } else {
          newGantt.push({ threadId: chosenId, start: newTime - 1, end: newTime, color: running.color });
        }

        // Random blocking (8% chance per tick when RUNNING, skip if remainingTime<=1)
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

    // 5. CPU utilization (% ticks CPU was active in last 30 ticks)
    const utilized = chosenId ? 1 : 0;
    const recentUtil = [
      ...cpuUtilHistory.slice(-29),
      { t: newTime, util: utilized ? 100 : 0 },
    ];
    // Smooth rolling average
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
