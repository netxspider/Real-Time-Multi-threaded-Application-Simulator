// src/components/metrics/ResultsModal.jsx
import React from 'react';
import { X, Award, Clock, TrendingUp, Zap, CheckCircle } from 'lucide-react';
import { useSimStore } from '../../store/simulationStore';

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function fmtAvg(val) {
  return isNaN(val) ? '—' : val.toFixed(2);
}

export default function ResultsModal({ onClose }) {
  const { userThreads, algorithm, model, time } = useSimStore();

  // Compute per-thread metrics
  const rows = userThreads.map(t => {
    const arrival = t.arrivalTime ?? 0;
    const burst = t.burstTime ?? 0;
    const completion = t.completionTime ?? time;
    const start = t.startTime ?? arrival;
    const turnaround = completion - arrival;
    const waiting = Math.max(0, turnaround - burst);
    const response = t.responseTime != null ? t.responseTime - arrival : 0;
    return {
      id: t.id,
      color: t.color,
      arrival,
      burst,
      start,
      completion,
      turnaround,
      waiting,
      response,
    };
  });

  const avgTurnaround = avg(rows.map(r => r.turnaround));
  const avgWaiting = avg(rows.map(r => r.waiting));
  const avgResponse = avg(rows.map(r => r.response));
  const avgBurst = avg(rows.map(r => r.burst));

  const cols = [
    { key: 'id', label: 'Thread', align: 'left' },
    { key: 'arrival', label: 'Arrival', align: 'center' },
    { key: 'burst', label: 'Burst', align: 'center' },
    { key: 'start', label: 'Start', align: 'center' },
    { key: 'completion', label: 'Completion', align: 'center' },
    { key: 'response', label: 'Response', align: 'center' },
    { key: 'waiting', label: 'Waiting', align: 'center' },
    { key: 'turnaround', label: 'Turnaround', align: 'center' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col rounded-2xl border border-gray-700 shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(150deg, #0f0f1a 0%, #11172a 50%, #0f1220 100%)',
          width: 'min(92vw, 820px)',
          maxHeight: '88vh',
        }}
      >
        {/* Glowing top border */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500" />

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
            <Award size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-100">Simulation Results</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {algorithm} · {model} · Completed at t = {time}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 px-6 pt-4 pb-2 shrink-0">
          {[
            { label: 'Avg Turnaround', value: fmtAvg(avgTurnaround), unit: ' ticks', icon: TrendingUp, color: '#6366f1' },
            { label: 'Avg Waiting', value: fmtAvg(avgWaiting), unit: ' ticks', icon: Clock, color: '#f59e0b' },
            { label: 'Avg Response', value: fmtAvg(avgResponse), unit: ' ticks', icon: Zap, color: '#22c55e' },
            { label: 'Avg Burst', value: fmtAvg(avgBurst), unit: ' ticks', icon: CheckCircle, color: '#a855f7' },
          ].map(card => (
            <div key={card.label}
              className="rounded-xl border border-gray-800 p-3 flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center gap-1.5">
                <card.icon size={12} style={{ color: card.color }} />
                <span className="text-xs text-gray-500">{card.label}</span>
              </div>
              <span className="text-xl font-bold" style={{ color: card.color }}>
                {card.value}
                <span className="text-xs font-normal text-gray-600 ml-0.5">{card.unit}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          <div className="rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800 sticky top-0">
                  {cols.map(c => (
                    <th key={c.key}
                      className="px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      style={{ textAlign: c.align }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {rows.map((row, i) => (
                  <tr key={row.id}
                    className={`transition-colors ${i % 2 === 0 ? 'bg-gray-900/20' : ''} hover:bg-indigo-950/20`}>
                    <td className="px-3 py-2.5 font-bold" style={{ color: row.color }}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                        {row.id}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-gray-300">{row.arrival}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-gray-300">{row.burst}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-gray-300">{row.start}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-gray-300">{row.completion}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-green-400">{row.response}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-amber-400">{row.waiting}</td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-indigo-400">{row.turnaround}</td>
                  </tr>
                ))}

                {/* Average row */}
                <tr className="bg-gray-800/50 border-t-2 border-gray-700">
                  <td className="px-3 py-2.5 font-bold text-gray-300">Average</td>
                  <td className="px-3 py-2.5 text-center text-gray-600">—</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-purple-400">{fmtAvg(avgBurst)}</td>
                  <td className="px-3 py-2.5 text-center text-gray-600">—</td>
                  <td className="px-3 py-2.5 text-center text-gray-600">—</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-green-400">{fmtAvg(avgResponse)}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-amber-400">{fmtAvg(avgWaiting)}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-indigo-400">{fmtAvg(avgTurnaround)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Metric legend */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div><span className="text-gray-500 font-medium">Turnaround</span> = Completion − Arrival</div>
            <div><span className="text-gray-500 font-medium">Waiting</span> = Turnaround − Burst</div>
            <div><span className="text-gray-500 font-medium">Response</span> = First CPU time − Arrival</div>
            <div><span className="text-gray-500 font-medium">Completion</span> = Time thread finished</div>
          </div>
        </div>
      </div>
    </div>
  );
}
