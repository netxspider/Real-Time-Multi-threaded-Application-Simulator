// src/components/metrics/RightSidebar.jsx
import React, { useState } from 'react';
import CpuUtilChart from './CpuUtilChart';
import ThreadStateChart from './ThreadStateChart';
import ThreadTable from './ThreadTable';
import LogConsole from './LogConsole';
import ResultsModal from './ResultsModal';
import { useSimStore } from '../../store/simulationStore';
import { useNavStore } from '../../store/navStore';
import { Activity, BarChart3, Lock, ChevronRight, Award } from 'lucide-react';

export default function RightSidebar() {
  const { time, completedCount, userThreads, simulationCompleted } = useSimStore();
  const goTo = useNavStore(s => s.goTo);
  const total = userThreads.length;

  const [showResults, setShowResults] = useState(false);

  // Auto-open results when sim completes
  React.useEffect(() => {
    if (simulationCompleted) {
      setShowResults(true);
    }
  }, [simulationCompleted]);

  return (
    <>
      <aside className="w-80 min-w-80 flex flex-col gap-3 bg-gray-900 border-l border-gray-800 p-3 overflow-y-auto h-full">
        {/* Header */}
        <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
          <Activity size={14} className="text-indigo-400" />
          <span className="text-sm font-bold text-gray-200">Performance</span>
          <span className="ml-auto font-mono text-xs text-gray-500">t={time}</span>
          {total > 0 && (
            <span className="text-xs text-gray-500">{completedCount}/{total} done</span>
          )}
        </div>

        {/* Results button — shows when sim completed or threads exist */}
        {simulationCompleted && (
          <button
            onClick={() => setShowResults(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.15))',
              borderColor: '#6366f1',
              color: '#a5b4fc',
              boxShadow: '0 0 20px rgba(99,102,241,0.15)',
            }}
          >
            <Award size={15} />
            View Simulation Results
            <ChevronRight size={13} className="ml-auto" />
          </button>
        )}

        {/* CPU Utilization Line Chart */}
        <div className="bg-gray-850 rounded-xl border border-gray-800 p-3">
          <CpuUtilChart />
        </div>

        {/* Thread State Bar Chart */}
        <div className="bg-gray-850 rounded-xl border border-gray-800 p-3">
          <ThreadStateChart />
        </div>

        {/* Thread Table */}
        <div className="bg-gray-850 rounded-xl border border-gray-800 p-3 flex-1 min-h-0" style={{ maxHeight: '200px' }}>
          <ThreadTable />
        </div>

        {/* Log Console */}
        <div className="bg-gray-850 rounded-xl border border-gray-800 p-3 flex-1 min-h-0" style={{ minHeight: '140px', maxHeight: '200px' }}>
          <LogConsole />
        </div>

        {/* ── Go to Thread Synchronisation Simulation ──────────────────────── */}
        <div className="shrink-0 mt-auto pt-2 border-t border-gray-800">
          <button
            onClick={() => goTo('sync')}
            className="w-full group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(79,70,229,0.12))',
              borderColor: 'rgba(124,58,237,0.35)',
            }}
          >
            {/* Lock icon */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
              style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(167,139,250,0.3)' }}
            >
              <Lock size={14} className="text-violet-400" />
            </div>

            <div className="flex flex-col items-start gap-0.5 min-w-0">
              <span className="text-sm font-semibold text-violet-300 group-hover:text-violet-200 transition-colors">
                Thread Sync Simulator
              </span>
              <span className="text-xs text-gray-500 truncate">
                Semaphores · Monitors · Critical Sections
              </span>
            </div>

            <ChevronRight
              size={15}
              className="ml-auto text-violet-500 group-hover:translate-x-0.5 transition-transform shrink-0"
            />
          </button>
        </div>
      </aside>

      {/* Results Modal */}
      {showResults && (
        <ResultsModal onClose={() => setShowResults(false)} />
      )}
    </>
  );
}
