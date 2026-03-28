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
  const { readyQueue, blockedQueue, userThreads, cpuCurrentThread, time } = useSimStore();

  const getThread = (id) => userThreads.find(t => t.id === id);

  // Threads still in NEW state (not yet arrived)
  const newThreads = userThreads.filter(t => t.state === 'NEW');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Queue Status</span>
        <span className="ml-auto text-xs font-bold text-green-400">{readyQueue.length} ready</span>
      </div>

      <div className="flex-1 flex flex-col gap-2.5 p-3 overflow-y-auto">

        {/* CPU Running */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">▶ Running</span>
          {cpuCurrentThread ? (() => {
            const t = getThread(cpuCurrentThread);
            return (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{ background: '#0c1f3a', borderColor: '#3b82f6', boxShadow: '0 0 10px #3b82f622' }}>
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                <span className="font-bold text-blue-300 text-xs">{cpuCurrentThread}</span>
                <span className="ml-auto text-xs text-gray-500 font-mono">
                  rem: <span className="text-blue-300 font-bold">{t?.remainingTime ?? '?'}</span>
                  <span className="text-gray-600">/{t?.burstTime ?? '?'}</span>
                </span>
              </div>
            );
          })() : (
            <div className="px-3 py-2 rounded-lg border border-gray-800 text-xs text-gray-700 italic">
              CPU idle
            </div>
          )}
        </div>

        {/* Ready Queue */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            ⏳ Ready Queue ({readyQueue.length})
          </span>
          <div className="flex flex-col gap-1">
            {readyQueue.length === 0 ? (
              <span className="text-xs text-gray-700 italic px-1">empty</span>
            ) : (
              readyQueue.map((id, idx) => {
                const t = getThread(id);
                const pct = t ? Math.round((t.remainingTime / t.burstTime) * 100) : 0;
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border log-entry"
                    style={{ background: '#071a0e', borderColor: STATE_COLORS.READY }}
                  >
                    <span className="text-gray-600 text-xs w-4 shrink-0">{idx + 1}.</span>
                    <span className="font-bold text-green-400 text-xs w-8 shrink-0">{id}</span>
                    {/* Progress bar */}
                    <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: STATE_COLORS.READY }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 font-mono shrink-0">
                      {t?.remainingTime ?? '?'}τ
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Blocked Queue */}
        {blockedQueue.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              🚫 Blocked ({blockedQueue.length})
            </span>
            <div className="flex flex-col gap-1">
              {blockedQueue.map(id => {
                const t = getThread(id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border log-entry"
                    style={{ background: '#1a0707', borderColor: STATE_COLORS.BLOCKED }}
                  >
                    <span className="font-bold text-red-400 text-xs w-8 shrink-0">{id}</span>
                    <span className="text-xs text-gray-600 shrink-0">
                      {t?.blockedBy && `wait ${t.blockedBy}`}
                    </span>
                    <span className="ml-auto text-xs text-red-500 font-mono">
                      -{t?.blockedTimer ?? 0}t
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* New (not-yet-arrived) threads */}
        {newThreads.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              🕐 Arriving Soon ({newThreads.length})
            </span>
            <div className="flex flex-col gap-1">
              {newThreads.map(t => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border"
                  style={{ background: '#0f1420', borderColor: '#374151' }}
                >
                  <span className="font-bold text-gray-500 text-xs w-8 shrink-0">{t.id}</span>
                  <span className="text-xs text-gray-600">arrives at</span>
                  <span className="ml-auto text-xs text-gray-400 font-mono">t={t.arrivalTime}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
