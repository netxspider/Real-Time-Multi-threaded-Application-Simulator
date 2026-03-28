// src/components/sync/SyncCenterPanel.jsx
import React, { useEffect, useState } from 'react';
import { useSyncStore } from '../../store/syncStore';

// ─── Thread Card ──────────────────────────────────────────────────────────────
function ThreadCard({ thread, showTimer = false, glow = false, dimmed = false }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const pct = thread.csTotalTime
    ? Math.max(0, (thread.csTimeRemaining / thread.csTotalTime) * 100)
    : 0;

  return (
    <div
      className={`
        flex flex-col gap-1 transition-all duration-500
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
        ${dimmed ? 'opacity-40' : ''}
      `}
    >
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-bold text-xs
          ${glow ? 'sync-thread-glow' : ''}
        `}
        style={{
          background: thread.color + '18',
          borderColor: thread.color + 'cc',
          color: thread.color,
          boxShadow: glow ? `0 0 18px ${thread.color}55` : `0 0 6px ${thread.color}22`,
        }}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${glow ? 'animate-pulse' : ''}`}
          style={{ background: thread.color }}
        />
        <span className="font-mono">{thread.id}</span>
        {showTimer && thread.csTimeRemaining > 0 && (
          <span className="ml-auto text-xs font-mono opacity-70">{thread.csTimeRemaining}τ</span>
        )}
      </div>
      {showTimer && thread.csTotalTime > 0 && (
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden mx-1">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: thread.color }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Wait queue slot ──────────────────────────────────────────────────────────
function WaitSlot({ thread, position }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-700 w-4 shrink-0 font-mono">{position}.</span>
      <ThreadCard thread={thread} />
    </div>
  );
}

// ─── CS Slot ─────────────────────────────────────────────────────────────────
function CSSlot({ thread, slotIndex }) {
  if (thread) {
    return (
      <div
        className="flex-1 min-h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 p-3 transition-all duration-500"
        style={{
          borderColor: thread.color + '99',
          background: thread.color + '0d',
          boxShadow: `inset 0 0 20px ${thread.color}11`,
        }}
      >
        <ThreadCard thread={thread} showTimer glow />
        <div className="text-xs text-gray-600 font-mono">executing...</div>
      </div>
    );
  }
  return (
    <div className="flex-1 min-h-28 rounded-2xl border-2 border-dashed border-gray-700/50 flex flex-col items-center justify-center gap-1 transition-all duration-300">
      <div className="w-8 h-8 rounded-full border border-dashed border-gray-700 flex items-center justify-center">
        <span className="text-gray-700 text-xs font-mono">{slotIndex + 1}</span>
      </div>
      <span className="text-xs text-gray-700">empty slot</span>
    </div>
  );
}

// ─── Arrow SVG ────────────────────────────────────────────────────────────────
function FlowArrow({ active }) {
  return (
    <div className={`flex flex-col items-center justify-center w-12 shrink-0 transition-all duration-300 ${active ? 'opacity-100' : 'opacity-20'}`}>
      <svg width="48" height="24" viewBox="0 0 48 24">
        <defs>
          <marker id="ah" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={active ? '#6366f1' : '#374151'} />
          </marker>
        </defs>
        <line x1="2" y1="12" x2="38" y2="12"
          stroke={active ? '#6366f1' : '#374151'}
          strokeWidth={active ? 2.5 : 1}
          markerEnd="url(#ah)"
          strokeDasharray={active ? '6 3' : '4 4'}
        />
      </svg>
      <span className="text-xs text-gray-700 font-mono mt-1">{active ? 'active' : '→'}</span>
    </div>
  );
}

// ─── Main Center Panel ────────────────────────────────────────────────────────
export default function SyncCenterPanel() {
  const {
    mechanism, capacity, semaphoreValue, threads,
    waitQueue, csOccupants, highlightPhase,
  } = useSyncStore();

  const getThread = id => threads.find(t => t.id === id);

  const waitingThreads = waitQueue.map(getThread).filter(Boolean);
  const csThreads = csOccupants.map(getThread).filter(Boolean);
  const exitingThreads = threads.filter(t => t.state === 'EXITING');

  // CS slots (capacity number of them)
  const slots = Array.from({ length: capacity }, (_, i) => csThreads[i] || null);

  const hasActivity = threads.length > 0;
  const isBlocked = highlightPhase === 'blocked';
  const isAcquired = highlightPhase === 'acquire' || highlightPhase === 'in_cs';
  const isWakingUp = highlightPhase === 'wakeup';

  // Lock indicator label
  const lockLabel = mechanism === 'Monitor'
    ? (semaphoreValue === 0 ? 'OCCUPIED' : 'FREE')
    : semaphoreValue === 0
      ? 'LOCKED'
      : mechanism === 'CountingSemaphore'
        ? `${semaphoreValue} FREE`
        : 'UNLOCKED';

  const lockColor = semaphoreValue === 0 ? '#ef4444' : '#22c55e';

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-950">

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasActivity ? 'bg-violet-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Visual Arena</span>
        </div>
        <span className="text-xs text-gray-600">
          {mechanism === 'CountingSemaphore' ? `Counting Semaphore (N=${capacity})` : mechanism}
        </span>
        {/* Lock status badge */}
        <div className="ml-auto flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold"
            style={{ borderColor: lockColor + '60', color: lockColor, background: lockColor + '12' }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: lockColor }} />
            {mechanism === 'Monitor' ? 'Monitor' :
             mechanism === 'CountingSemaphore' ? `S = ${semaphoreValue}` : 'Mutex'} · {lockLabel}
          </div>
        </div>
      </div>

      {/* Main visual area */}
      <div className="flex-1 flex min-h-0 p-4 gap-4">

        {/* ── ZONE A: ENTRY + WAIT QUEUE ─────────────────────────────────────── */}
        <div className="w-52 shrink-0 flex flex-col gap-3">
          {/* Zone label */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-amber-400/80 uppercase tracking-widest">
              ① Entry Section
            </span>
            <span className="text-xs text-gray-600 font-mono">
              {mechanism === 'Mutex' ? 'wait(mutex)' :
               mechanism === 'Monitor' ? 'monitor.enter()' :
               'wait(S)'}
            </span>
          </div>

          {/* Wait Queue box */}
          <div className={`flex-1 flex flex-col gap-2 rounded-2xl border-2 p-3 transition-all duration-300 ${
            isBlocked ? 'border-red-500/50 bg-red-950/10' : 'border-gray-700/50 bg-gray-900/40'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wide ${isBlocked ? 'text-red-400' : 'text-gray-500'}`}>
                Wait Queue
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                waitingThreads.length > 0
                  ? 'bg-red-900/40 text-red-400 border border-red-700/50'
                  : 'bg-gray-800 text-gray-600'
              }`}>
                {waitingThreads.length}
              </span>
            </div>

            {waitingThreads.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-40">
                <div className="w-10 h-10 rounded-xl border border-dashed border-gray-700 flex items-center justify-center">
                  <span className="text-gray-600 text-lg">∅</span>
                </div>
                <span className="text-xs text-gray-700">No threads waiting</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 overflow-y-auto">
                {waitingThreads.map((t, idx) => (
                  <WaitSlot key={t.id} thread={t} position={idx + 1} />
                ))}
              </div>
            )}

            {/* FIFO indicator */}
            {waitingThreads.length > 1 && (
              <div className="text-xs text-gray-700 text-center border-t border-gray-800 pt-2 mt-1">
                FIFO order ↑ first
              </div>
            )}
          </div>

          {/* Blocked phase callout */}
          {isBlocked && (
            <div className="px-3 py-2 rounded-xl bg-red-950/30 border border-red-700/40 text-xs text-red-400 font-mono animate-pulse">
              thread blocked → wait queue
            </div>
          )}
        </div>

        {/* Arrow A → CS */}
        <FlowArrow active={isAcquired || isWakingUp} />

        {/* ── ZONE B: CRITICAL SECTION ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-indigo-400/90 uppercase tracking-widest">
              ② Critical Section
            </span>
            <span className="text-xs text-gray-600 font-mono">
              execute_critical_section()
            </span>
          </div>

          {/* CS Box */}
          <div className={`flex-1 rounded-2xl border-2 p-4 flex flex-col gap-3 relative overflow-hidden transition-all duration-500 ${
            csThreads.length > 0
              ? 'border-indigo-500/60 bg-indigo-950/20'
              : 'border-gray-700/40 bg-gray-900/20'
          }`}
            style={csThreads.length > 0 ? {
              boxShadow: `inset 0 0 40px rgba(99, 102, 241, 0.07), 0 0 24px rgba(99, 102, 241, 0.08)`
            } : {}}>

            {/* CS inner glow when active */}
            {csThreads.length > 0 && (
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.06) 0%, transparent 70%)' }}
              />
            )}

            {/* CS header */}
            <div className="flex items-center justify-between relative">
              <span className={`text-sm font-bold ${csThreads.length > 0 ? 'text-indigo-300' : 'text-gray-600'}`}>
                {mechanism === 'Monitor' ? '⬡ Monitor Exclusive Zone' : '⬡ Critical Section'}
              </span>
              <span className="text-xs font-mono text-gray-600">
                {csThreads.length}/{capacity} occupied
              </span>
            </div>

            {/* Slots */}
            <div className={`flex-1 flex gap-3 ${capacity === 1 ? 'flex-col' : 'flex-row flex-wrap'}`}>
              {slots.map((thread, i) => (
                <CSSlot key={i} thread={thread} slotIndex={i} />
              ))}
            </div>

            {/* Mechanism annotation */}
            {capacity === 1 && csThreads.length === 0 && (
              <div className="text-center text-xs text-gray-700 font-mono">
                {mechanism === 'Mutex' ? '[ mutex unlocked — slot available ]' : '[ monitor free — enter allowed ]'}
              </div>
            )}
          </div>

          {/* Acquire phase callout */}
          {isWakingUp && (
            <div className="px-3 py-2 rounded-xl bg-green-950/30 border border-green-700/40 text-xs text-green-400 font-mono">
              ↑ signal() → woke up next waiting thread
            </div>
          )}
        </div>

        {/* Arrow CS → Exit */}
        <FlowArrow active={exitingThreads.length > 0} />

        {/* ── ZONE C: EXIT SECTION ───────────────────────────────────────────── */}
        <div className="w-44 shrink-0 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-green-400/80 uppercase tracking-widest">
              ③ Exit Section
            </span>
            <span className="text-xs text-gray-600 font-mono">
              {mechanism === 'Mutex' ? 'signal(mutex)' :
               mechanism === 'Monitor' ? 'monitor.exit()' :
               'signal(S)'}
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-2 rounded-2xl border-2 border-gray-700/40 bg-gray-900/20 p-3 overflow-y-auto">
            <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Releasing</span>

            {exitingThreads.length === 0 ? (
              <div className="flex-1 flex items-center justify-center opacity-30">
                <span className="text-xs text-gray-700">—</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {exitingThreads.map(t => (
                  <ThreadCard key={t.id} thread={t} dimmed />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {threads.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none" style={{ top: '48px' }}>
          <div className="w-20 h-20 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3d3d55" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              <circle cx="12" cy="16" r="1" fill="#3d3d55"/>
            </svg>
          </div>
          <p className="text-sm text-gray-600">Spawn a thread to start the simulation</p>
        </div>
      )}
    </main>
  );
}
