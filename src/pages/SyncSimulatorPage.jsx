// src/pages/SyncSimulatorPage.jsx
import React from 'react';
import { ArrowLeft, Lock, GitMerge, Shield } from 'lucide-react';
import { useSyncGameLoop } from '../engine/syncGameLoop';
import SyncLeftPanel from '../components/sync/SyncLeftPanel';
import SyncCenterPanel from '../components/sync/SyncCenterPanel';
import SyncRightPanel from '../components/sync/SyncRightPanel';
import { useNavStore } from '../store/navStore';
import { useSyncStore } from '../store/syncStore';

const MECHANISM_META = {
  Mutex: {
    icon: Lock,
    color: '#a78bfa',
    bg: 'from-violet-900/20 to-transparent',
    desc: 'Binary semaphore — only 1 thread enters CS at a time',
  },
  CountingSemaphore: {
    icon: GitMerge,
    color: '#60a5fa',
    bg: 'from-blue-900/20 to-transparent',
    desc: 'N threads may enter CS simultaneously',
  },
  Monitor: {
    icon: Shield,
    color: '#34d399',
    bg: 'from-emerald-900/20 to-transparent',
    desc: 'High-level construct with condition variables',
  },
};

export default function SyncSimulatorPage() {
  useSyncGameLoop();
  const goTo = useNavStore(s => s.goTo);
  const { mechanism, semaphoreValue, waitQueue, csOccupants } = useSyncStore();

  const meta = MECHANISM_META[mechanism] || MECHANISM_META.Mutex;
  const Icon = meta.icon;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-950 text-gray-100">
      {/* ── Top Nav Bar ─────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 bg-gray-900"
        style={{ background: 'linear-gradient(90deg, #0d0d1a 0%, #111128 100%)' }}>

        {/* Back button */}
        <button
          onClick={() => goTo('simulator')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-gray-100 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all group"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          Scheduler Sim
        </button>

        <div className="w-px h-5 bg-gray-700" />

        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: meta.color + '25', border: `1px solid ${meta.color}40` }}
          >
            <Icon size={14} style={{ color: meta.color }} />
          </div>
          <div>
            <span className="text-sm font-bold text-gray-100">Thread Synchronization Simulator</span>
            <span className="ml-2 text-xs text-gray-500">Critical Section Problem</span>
          </div>
        </div>

        {/* Mechanism badge */}
        <div
          className="ml-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
          style={{ color: meta.color, borderColor: meta.color + '50', background: meta.color + '12' }}
        >
          <Icon size={11} />
          {mechanism === 'CountingSemaphore' ? 'Counting Semaphore' : mechanism}
        </div>

        {/* Live stats */}
        <div className="ml-auto flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-gray-500">In CS:</span>
            <span className="text-indigo-400 font-bold font-mono">{csOccupants.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-gray-500">Waiting:</span>
            <span className="text-amber-400 font-bold font-mono">{waitQueue.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: semaphoreValue === 0 ? '#ef4444' : '#22c55e' }} />
            <span className="text-gray-500">S =</span>
            <span
              className="font-bold font-mono"
              style={{ color: semaphoreValue === 0 ? '#ef4444' : '#22c55e' }}
            >
              {semaphoreValue}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SyncLeftPanel />
        <SyncCenterPanel />
        <SyncRightPanel />
      </div>
    </div>
  );
}
