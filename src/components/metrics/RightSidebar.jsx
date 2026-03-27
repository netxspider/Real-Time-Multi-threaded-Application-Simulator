// src/components/metrics/RightSidebar.jsx
import React from 'react';
import CpuUtilChart from './CpuUtilChart';
import ThreadStateChart from './ThreadStateChart';
import ThreadTable from './ThreadTable';
import LogConsole from './LogConsole';
import { useSimStore } from '../../store/simulationStore';
import { Activity } from 'lucide-react';

export default function RightSidebar() {
  const { time, completedCount, userThreads } = useSimStore();
  const total = userThreads.length;

  return (
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
    </aside>
  );
}
