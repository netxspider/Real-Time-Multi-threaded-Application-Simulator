// src/components/sync/SyncLeftPanel.jsx
import React from 'react';
import {
  Play, Pause, RotateCcw, ChevronDown, Plus, Zap,
  ChevronRight, Settings, Bot,
} from 'lucide-react';
import { useSyncStore } from '../../store/syncStore';

const SPEED_OPTIONS = [
  { value: 0.25, label: '0.25×' },
  { value: 0.5,  label: '0.5×'  },
  { value: 1,    label: '1×'    },
  { value: 2,    label: '2×'    },
  { value: 4,    label: '4×'    },
];

const MECHANISMS = ['Mutex', 'CountingSemaphore', 'Monitor'];
const MECHANISM_LABELS = {
  Mutex: 'Mutex (Binary Semaphore)',
  CountingSemaphore: 'Counting Semaphore',
  Monitor: 'Monitor',
};

export default function SyncLeftPanel() {
  const {
    mechanism, capacity, semaphoreValue, isRunning, isPaused,
    speed, threads, autoSpawn, autoSpawnInterval, nextId,
    setMechanism, setCapacity, setSpeed, setAutoSpawn,
    play, pause, reset, spawnThread, step,
  } = useSyncStore();

  const simActive = threads.length > 0;
  const isLocked = semaphoreValue === 0;
  const csCount = threads.filter(t => t.state === 'IN_CS').length;
  const waitCount = threads.filter(t => t.state === 'WAITING').length;

  return (
    <aside className="w-72 min-w-72 flex flex-col gap-4 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto h-full">

      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-gray-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-100">Thread Sync Sim</h1>
          <p className="text-xs text-gray-500">Critical Section Problem</p>
        </div>
      </div>

      {/* Mechanism */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-widest">
          <Settings size={12} /> Mechanism
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Sync Primitive</label>
          <div className="relative">
            <select
              value={mechanism}
              onChange={e => setMechanism(e.target.value)}
              disabled={simActive}
              className="w-full appearance-none bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2.5 pr-8 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 cursor-pointer disabled:opacity-40 transition-colors"
            >
              {MECHANISMS.map(m => (
                <option key={m} value={m}>{MECHANISM_LABELS[m]}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {mechanism === 'CountingSemaphore' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Max Capacity (N)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1} max={8}
                value={capacity}
                onChange={e => setCapacity(Number(e.target.value))}
                disabled={simActive}
                className="flex-1 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-violet-500 disabled:opacity-40"
              />
              <span className="text-xs text-gray-500">slots</span>
            </div>
          </div>
        )}

        {simActive && (
          <p className="text-xs text-amber-400/70 flex items-center gap-1">
            <span>⚠</span> Reset to change mechanism
          </p>
        )}
      </section>

      {/* Live Semaphore Status */}
      {simActive && (
        <section className="rounded-xl border border-gray-800 overflow-hidden">
          <div className="bg-gray-800/50 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Live State
          </div>
          <div className="p-3 flex flex-col gap-2">
            {/* S value */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {mechanism === 'Monitor' ? 'occupied' : 'S (semaphore)'}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-black font-mono ${isLocked ? 'text-red-400' : 'text-violet-400'}`}>
                  {mechanism === 'Monitor' ? (isLocked ? 'true' : 'false') : semaphoreValue}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isLocked
                    ? 'bg-red-900/40 text-red-400 border border-red-800/60'
                    : 'bg-green-900/40 text-green-400 border border-green-800/60'
                }`}>
                  {isLocked ? (mechanism === 'Monitor' ? 'LOCKED' : 'LOCKED') : 'FREE'}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>In CS: <span className="text-blue-400 font-bold">{csCount}</span></span>
              <span>Waiting: <span className="text-amber-400 font-bold">{waitCount}</span></span>
              <span>Total: <span className="text-gray-300 font-bold">{threads.length}</span></span>
            </div>
            {/* capacity bar */}
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round((csCount / (capacity || 1)) * 100)}%`,
                  background: `linear-gradient(90deg, #7c3aed, #6366f1)`,
                }}
              />
            </div>
            <div className="text-xs text-gray-600 text-right">
              {csCount}/{capacity} CS slots used
            </div>
          </div>
        </section>
      )}

      {/* Thread Spawner */}
      <section className="flex flex-col gap-2.5 pt-1 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-widest">
          <Plus size={12} /> Thread Spawner
        </div>

        <button
          onClick={spawnThread}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all active:scale-95 shadow-lg shadow-violet-900/30"
        >
          <Plus size={16} />
          Spawn Thread ({`T${useSyncStore.getState().nextId}`})
        </button>

        {/* Auto Spawn Toggle */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Bot size={12} className="text-gray-500" />
            <span className="text-xs text-gray-400">Auto-Spawn</span>
          </div>
          <button
            onClick={() => setAutoSpawn(!autoSpawn)}
            className={`relative w-10 h-5 rounded-full transition-colors ${autoSpawn ? 'bg-violet-600' : 'bg-gray-700'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${autoSpawn ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        {autoSpawn && (
          <p className="text-xs text-violet-400/70 flex items-center gap-1 px-1">
            <span>⚡</span> Thread spawns every {autoSpawnInterval} ticks
          </p>
        )}
      </section>

      {/* Speed */}
      <section className="flex flex-col gap-2 pt-1 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-widest">
          <Zap size={12} /> Simulation Speed
        </div>
        <div className="grid grid-cols-5 gap-1">
          {SPEED_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSpeed(opt.value)}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all ${
                speed === opt.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Playback */}
      <section className="flex flex-col gap-2.5 pt-1 border-t border-gray-800 mt-auto">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-widest">
          Playback
        </div>
        <div className="flex gap-2">
          <button
            onClick={isRunning ? pause : play}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-violet-600 hover:bg-violet-500 text-white'
            }`}
          >
            {isRunning ? <><Pause size={14} fill="currentColor" /> Pause</> : <><Play size={14} fill="currentColor" /> {isPaused ? 'Resume' : 'Play'}</>}
          </button>

          <button
            onClick={step}
            disabled={isRunning}
            className="px-3 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
            title="Step forward one tick"
          >
            <ChevronRight size={16} />
          </button>

          <button
            onClick={reset}
            className="px-3 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-semibold transition-all active:scale-95"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </section>
    </aside>
  );
}
