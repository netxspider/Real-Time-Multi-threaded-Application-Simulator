// src/components/scheduling/ReadyQueuePanel.jsx
import React from 'react';
import { useSimStore } from '../../store/simulationStore';

const STATE_COLORS = {
  NEW: '#64748b',
  READY: '#22c55e',
  RUNNING: '#3b82f6',
  BLOCKED: '#ef4444',
  TERMINATED: '#374151',
};

export default function ReadyQueuePanel() {
  const { readyQueue, blockedQueue, userThreads, cpuCurrentThread } = useSimStore();

  const getThread = (id) => userThreads.find(t => t.id === id);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Ready Queue</span>
        <span className="ml-auto text-xs font-bold text-green-400">{readyQueue.length} waiting</span>
      </div>

      <div className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto">
        {/* CPU Running */}
        {cpuCurrentThread && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-14 shrink-0">Running</span>
            <div className="flex gap-1.5 items-center">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border"
                style={{
                  background: '#1e3a8a',
                  borderColor: '#3b82f6',
                  color: '#93c5fd',
                  boxShadow: '0 0 12px #3b82f644'
                }}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                {cpuCurrentThread}
              </div>
            </div>
          </div>
        )}

        {/* Ready Queue */}
        <div className="flex items-start gap-2">
          <span className="text-xs text-gray-500 w-14 shrink-0 pt-1.5">Ready</span>
          <div className="flex flex-wrap gap-1.5">
            {readyQueue.length === 0 ? (
              <span className="text-xs text-gray-700 italic">empty</span>
            ) : (
              readyQueue.map((id, idx) => {
                const t = getThread(id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all log-entry"
                    style={{
                      background: '#0f2e1a',
                      borderColor: STATE_COLORS.READY,
                      color: STATE_COLORS.READY,
                    }}
                    title={`Burst: ${t?.burstTime}, Remaining: ${t?.remainingTime}`}
                  >
                    <span className="text-gray-500 text-xs">{idx + 1}.</span>
                    {id}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Blocked Queue */}
        {blockedQueue.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-500 w-14 shrink-0 pt-1.5">Blocked</span>
            <div className="flex flex-wrap gap-1.5">
              {blockedQueue.map(id => {
                const t = getThread(id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border log-entry"
                    style={{
                      background: '#2d0f0f',
                      borderColor: STATE_COLORS.BLOCKED,
                      color: STATE_COLORS.BLOCKED,
                    }}
                    title={`Blocked by: ${t?.blockedBy}, Timer: ${t?.blockedTimer}`}
                  >
                    {id}
                    {t?.blockedBy && <span className="text-xs opacity-70">({t.blockedBy})</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
