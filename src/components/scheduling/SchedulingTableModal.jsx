// src/components/scheduling/SchedulingTableModal.jsx
import React from 'react';
import { X } from 'lucide-react';
import { useSimStore } from '../../store/simulationStore';

function avg(arr) {
  if (!arr.length) return 0;
  return (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2);
}

function Cell({ children, className = '' }) {
  return (
    <td className={`px-4 py-2.5 text-sm text-center whitespace-nowrap ${className}`}>
      {children}
    </td>
  );
}

function HeadCell({ children }) {
  return (
    <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center whitespace-nowrap bg-gray-800/80 border-b border-gray-700">
      {children}
    </th>
  );
}

export default function SchedulingTableModal({ onClose }) {
  const { userThreads } = useSimStore();

  // Build per-thread metrics row
  // waitingTime = completionTime - arrivalTime - burstTime  (industry standard)
  // turnaroundTime = completionTime - arrivalTime
  // responseTime = startTime - arrivalTime
  const rows = userThreads
    .filter(t => t.completionTime !== null)
    .map(t => {
      const turnaround = (t.completionTime ?? 0) - t.arrivalTime;
      const waiting = turnaround - t.burstTime;
      const response = (t.startTime ?? t.arrivalTime) - t.arrivalTime;
      return {
        id: t.id,
        color: t.color,
        arrivalTime: t.arrivalTime,
        burstTime: t.burstTime,
        startTime: t.startTime ?? t.arrivalTime,
        completionTime: t.completionTime,
        turnaroundTime: turnaround,
        waitingTime: Math.max(0, waiting),
        responseTime: Math.max(0, response),
      };
    })
    .sort((a, b) => a.arrivalTime - b.arrivalTime || a.id.localeCompare(b.id));

  // Averages
  const avgTurnaround = avg(rows.map(r => r.turnaroundTime));
  const avgWaiting    = avg(rows.map(r => r.waitingTime));
  const avgResponse   = avg(rows.map(r => r.responseTime));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col max-h-[85vh]">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-100">CPU Scheduling Table</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Thread metrics — Completion, Turnaround, Waiting &amp; Response times
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                <HeadCell>Thread</HeadCell>
                <HeadCell>Arrival (AT)</HeadCell>
                <HeadCell>Burst (BT)</HeadCell>
                <HeadCell>Start (ST)</HeadCell>
                <HeadCell>Completion (CT)</HeadCell>
                <HeadCell>Turnaround (TAT)</HeadCell>
                <HeadCell>Waiting (WT)</HeadCell>
                <HeadCell>Response (RT)</HeadCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {rows.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? 'bg-gray-900/50' : 'bg-gray-850/30'}>
                  <Cell>
                    <span
                      className="inline-flex items-center gap-1.5 font-bold font-mono text-sm"
                      style={{ color: r.color }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        style={{ background: r.color, boxShadow: `0 0 6px ${r.color}88` }}
                      />
                      {r.id}
                    </span>
                  </Cell>
                  <Cell className="text-gray-300 font-mono">{r.arrivalTime}</Cell>
                  <Cell className="text-gray-300 font-mono">{r.burstTime}</Cell>
                  <Cell className="text-gray-300 font-mono">{r.startTime}</Cell>
                  <Cell className="text-gray-300 font-mono">{r.completionTime}</Cell>
                  <Cell>
                    <span className="font-semibold text-purple-400 font-mono">{r.turnaroundTime}</span>
                  </Cell>
                  <Cell>
                    <span className="font-semibold text-amber-400 font-mono">{r.waitingTime}</span>
                  </Cell>
                  <Cell>
                    <span className="font-semibold text-cyan-400 font-mono">{r.responseTime}</span>
                  </Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Averages footer */}
        <div className="shrink-0 px-6 py-4 border-t border-gray-800 bg-gray-950 rounded-b-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Averages</span>
            <span className="text-xs text-gray-600">across {rows.length} threads</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Avg. Turnaround', value: avgTurnaround, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
              { label: 'Avg. Waiting',    value: avgWaiting,    color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'Avg. Response',   value: avgResponse,   color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20' },
            ].map(m => (
              <div key={m.label} className={`rounded-xl border p-3 ${m.bg}`}>
                <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                <p className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</p>
                <p className="text-xs text-gray-600">ticks</p>
              </div>
            ))}
          </div>

          {/* Formula reference */}
          <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-3 gap-2 text-xs text-gray-600">
            <span>TAT = CT − AT</span>
            <span>WT = TAT − BT</span>
            <span>RT = ST − AT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
