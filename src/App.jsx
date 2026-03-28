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
import { useNavStore } from './store/navStore';
import SyncSimulatorPage from './pages/SyncSimulatorPage';

// ─── Center Panel ─────────────────────────────────────────────────────────────
function CenterPanel() {
  const { algorithm, timeQuantum, isRunning, isPaused, userThreads } = useSimStore();

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Top: Thread Model Visualization */}
      <section
        className="flex flex-col bg-gray-950 border-b border-gray-800"
        style={{ height: '55%', minHeight: 220 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-green-400 animate-pulse'
                : isPaused ? 'bg-amber-400'
                : 'bg-gray-600'
              }`}
            />
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

        {/* Thread Mapper — always shown, renders preview when no threads yet */}
        <div className="flex-1 min-h-0 p-2">
          <ThreadMapper />
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

// ─── Main Simulator Page ──────────────────────────────────────────────────────
function SimulatorPage() {
  useGameLoop();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100">
      <ControlPanel />
      <CenterPanel />
      <RightSidebar />
    </div>
  );
}

// ─── Root App — page router ───────────────────────────────────────────────────
export default function App() {
  const page = useNavStore(s => s.page);

  if (page === 'sync') {
    return <SyncSimulatorPage />;
  }

  return <SimulatorPage />;
}
