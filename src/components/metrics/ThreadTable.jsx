// src/components/metrics/ThreadTable.jsx
import React from 'react';
import { useSimStore } from '../../store/simulationStore';

const STATE_BADGE = {
  NEW:        { bg: '#1e293b', text: '#94a3b8', label: 'NEW' },
  READY:      { bg: '#052e16', text: '#22c55e', label: 'READY' },
  RUNNING:    { bg: '#1e3a8a', text: '#60a5fa', label: 'RUN' },
  TERMINATED: { bg: '#111118', text: '#374151', label: 'DONE' },
};

export default function ThreadTable() {
  const { userThreads } = useSimStore();

  const sorted = [...userThreads].sort((a, b) => {
    const order = { RUNNING: 0, READY: 1, NEW: 2, TERMINATED: 3 };
    return (order[a.state] ?? 9) - (order[b.state] ?? 9);
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
        Thread Status
      </span>
      <div className="overflow-y-auto flex-1 rounded-lg border border-gray-800">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900 sticky top-0">
              {['ID', 'Pri', 'State', 'Burst', 'Rem', 'Map'].map(h => (
                <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => {
              const badge = STATE_BADGE[t.state] || STATE_BADGE.NEW;
              const isTerminated = t.state === 'TERMINATED';
              return (
                <tr
                  key={t.id}
                  className={`border-b border-gray-800 transition-colors ${
                    t.state === 'RUNNING' ? 'bg-blue-950/30' :
                    i % 2 === 0 ? 'bg-gray-900/30' : ''
                  }`}
                >
                  <td className="px-2 py-1.5 font-bold" style={{ color: isTerminated ? '#374151' : t.color }}>
                    {t.id}
                  </td>
                  <td className="px-2 py-1.5 text-gray-500">{t.priority}</td>
                  <td className="px-2 py-1.5">
                    <span className="px-1.5 py-0.5 rounded text-xs font-bold"
                      style={{ background: badge.bg, color: badge.text }}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-500">{t.burstTime}</td>
                  <td className="px-2 py-1.5">
                    <span className={isTerminated ? 'text-gray-700' : 'text-gray-300 font-medium'}>
                      {isTerminated ? '—' : t.remainingTime}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-600">{t.mappedTo ?? '—'}</td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-gray-700 text-xs">
                  No threads created yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
