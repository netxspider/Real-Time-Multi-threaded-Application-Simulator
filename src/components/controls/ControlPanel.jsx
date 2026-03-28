// src/components/controls/ControlPanel.jsx
import React, { useState } from 'react';
import {
  Play, Pause, RotateCcw, Zap, Cpu,
  Settings, ChevronDown, Clock, Table2, Pencil
} from 'lucide-react';
import { useSimStore } from '../../store/simulationStore';
import { getKernelCount } from '../../engine/threadModel';
import ThreadConfigModal from './ThreadConfigModal';

const Select = ({ label, value, onChange, options, disabled }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-40 transition-colors"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  </div>
);

const Slider = ({ label, value, onChange, min, max, step = 1, unit = '', disabled }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex justify-between items-center">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
      <span className="text-xs font-bold text-indigo-400">{value}{unit}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      disabled={disabled}
      className="w-full h-1.5 rounded-full appearance-none bg-gray-700 cursor-pointer accent-indigo-500 disabled:opacity-40"
    />
    <div className="flex justify-between text-xs text-gray-600">
      <span>{min}{unit}</span><span>{max}{unit}</span>
    </div>
  </div>
);

// Speed options: ticks/sec values mapped to display labels
const SPEED_OPTIONS = [
  { value: 0.25, label: '0.25×' },
  { value: 0.5, label: '0.5×' },
  { value: 0.75, label: '0.75×' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
  { value: 8, label: '8×' },
];

export default function ControlPanel() {
  const {
    numUserThreads, model, algorithm, timeQuantum, speed, threadConfigs,
    isRunning, isPaused, userThreads,
    setNumUserThreads, setModel, setAlgorithm, setTimeQuantum, setSpeed,
    createSimulation, startSim, pauseSim, resumeSim, resetSim,
  } = useSimStore();

  const [showConfigModal, setShowConfigModal] = useState(false);

  const kCount = getKernelCount(model, numUserThreads);
  const simCreated = userThreads.length > 0;

  // Play/Pause toggle handler
  const handlePlayPause = () => {
    if (isRunning) {
      pauseSim();
    } else if (isPaused) {
      resumeSim();
    } else {
      if (!simCreated) createSimulation();
      startSim();
    }
  };

  const isPlayingNow = isRunning && !isPaused;

  // Inline thread config summary (collapsed)
  const configSummary = threadConfigs.slice(0, numUserThreads);
  const simActive = isRunning || isPaused || simCreated;

  return (
    <>
      <aside className="w-72 min-w-72 flex flex-col gap-4 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto h-full">

        {/* Header */}
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Cpu size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-100">Thread Simulator</h1>
            <p className="text-xs text-gray-500">OS Multithreading</p>
          </div>
        </div>

        {/* Configuration Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-widest">
            <Settings size={12} /> Configuration
          </div>

          <Select
            label="Thread Model"
            value={model}
            onChange={setModel}
            options={['One-to-One', 'Many-to-One', 'Many-to-Many']}
            disabled={isRunning}
          />

          {/* User Thread Count Slider  */}
          <Slider
            label="User Threads"
            value={numUserThreads}
            onChange={setNumUserThreads}
            min={1} max={10}
            disabled={isRunning}
          />

          {/* Auto Kernel Count */}
          <div className="bg-gray-800 rounded-lg px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-purple-400" />
              <span className="text-xs text-gray-400">Kernel Threads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-purple-400">{kCount}</span>
              <span className="text-xs text-gray-500">auto</span>
            </div>
          </div>

          <Select
            label="Scheduling Algorithm"
            value={algorithm}
            onChange={setAlgorithm}
            options={['Round Robin', 'FCFS', 'SJF']}
            disabled={isRunning}
          />

          {algorithm === 'Round Robin' && (
            <Slider
              label="Time Quantum"
              value={timeQuantum}
              onChange={setTimeQuantum}
              min={1} max={20}
              unit=" ticks"
              disabled={isRunning}
            />
          )}
        </section>

        {/* Thread Configuration Table (inline summary + edit) */}
        <section className="flex flex-col gap-2 pt-1 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-widest">
              <Table2 size={12} /> Thread Config
            </div>
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-400/50 transition-all"
            >
              <Pencil size={10} />
              Edit
            </button>
          </div>

          {/* Compact summary table */}
          <div className="rounded-lg border border-gray-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-800/80">
                  <th className="text-left text-gray-500 font-semibold px-2 py-1.5 w-12">Thread</th>
                  <th className="text-center text-gray-500 font-semibold px-2 py-1.5">Arrival</th>
                  <th className="text-center text-gray-500 font-semibold px-2 py-1.5">Burst</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {configSummary.map((cfg, idx) => (
                  <tr key={cfg.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-2 py-1.5">
                      <span
                        className="font-mono font-bold"
                        style={{ color: `hsl(${(idx * 47) % 360}, 70%, 65%)` }}
                      >
                        {cfg.id}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono text-gray-300">{cfg.arrivalTime}<span className="text-gray-600 ml-0.5">t</span></td>
                    <td className="px-2 py-1.5 text-center font-mono text-gray-300">{cfg.burstTime}<span className="text-gray-600 ml-0.5">τ</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {simActive && !isRunning && (
            <p className="text-xs text-amber-400/70 flex items-center gap-1">
              <span className="text-amber-500">⚠</span> Reset to edit config
            </p>
          )}
        </section>

        {/* Simulation Speed */}
        <section className="flex flex-col gap-2.5 pt-1 border-t border-gray-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-widest">
            <Zap size={12} /> Simulation Speed
          </div>

          {/* Segmented speed buttons */}
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
          >
            {SPEED_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSpeed(opt.value)}
                className={`py-1.5 rounded-md text-xs font-semibold transition-all
                  ${speed === opt.value
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-gray-700/60'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Playback Controls */}
        <section className="flex flex-col gap-2.5 pt-1 border-t border-gray-800 mt-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-widest">
            <Clock size={12} /> Playback
          </div>

          <div className="flex gap-2">
            {/* Play / Pause toggle */}
            <button
              onClick={handlePlayPause}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-white text-sm font-semibold transition-all active:scale-95
                ${isPlayingNow
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
            >
              {isPlayingNow ? (
                <>
                  <Pause size={14} fill="currentColor" />
                  Pause
                </>
              ) : (
                <>
                  <Play size={14} fill="currentColor" />
                  {isPaused ? 'Resume' : 'Play'}
                </>
              )}
            </button>

            {/* Reset */}
            <button
              onClick={resetSim}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-semibold transition-all active:scale-95"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        </section>
      </aside>

      {/* Thread Config Modal */}
      {showConfigModal && (
        <ThreadConfigModal onClose={() => setShowConfigModal(false)} />
      )}
    </>
  );
}
