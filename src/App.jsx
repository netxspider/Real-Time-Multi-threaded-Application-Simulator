// src/App.jsx
import React from 'react';
import { useGameLoop } from './engine/gameLoop';
import ControlPanel from './components/controls/ControlPanel';
import ThreadMapper from './components/visualization/ThreadMapper';
import StateLegend from './components/visualization/StateLegend';
import GanttChart from './components/scheduling/GanttChart';
import ReadyQueuePanel from './components/scheduling/ReadyQueuePanel';
import RightSidebar from './components/metrics/RightSidebar';
import { useSimStore } from './store/simulationStore';

function CenterPanel() {
  const { algorithm, timeQuantum, isRunning, isPaused, userThreads, time } = useSimStore();

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Top: Thread Model Visualization */}
      <section className="flex flex-col bg-gray-950 border-b border-gray-800"
        style={{ height: '55%', minHeight: 220 }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : isPaused ? 'bg-amber-400' : 'bg-gray-600'}`} />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Thread Mapping
            </span>
          </div>
          <div className="ml-auto">
            <StateLegend />
          </div>
          <span className="text-xs text-gray-600 font-mono">
            {algorithm}{algorithm === 'Round Robin' ? ` (q=${timeQuantum})` : ''}
          </span>
        </div>

        {/* Thread Mapper SVG */}
        <div className="flex-1 min-h-0 p-2">
          {userThreads.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="13" stroke="#3d3d55" strokeWidth="2" strokeDasharray="4 3" />
                  <circle cx="16" cy="16" r="5" fill="#3d3d55" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Configure and press <span className="text-indigo-400 font-semibold">Play</span> or <span className="text-gray-400 font-semibold">Preview</span> to start</p>
            </div>
          ) : (
            <ThreadMapper />
          )}
        </div>
      </section>

      {/* Bottom: CPU Scheduling */}
      <section className="flex-1 flex min-h-0">
        {/* Gantt Chart */}
        <div className="flex-1 flex flex-col border-r border-gray-800 min-w-0 bg-gray-950">
          <GanttChart />
        </div>

        {/* Ready Queue */}
        <div className="w-72 shrink-0 bg-gray-950 flex flex-col">
          <ReadyQueuePanel />
        </div>
      </section>
    </main>
  );
}

export default function App() {
  // Activate the game loop globally
  useGameLoop();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100">
      <ControlPanel />
      <CenterPanel />
      <RightSidebar />
    </div>
  );
}
