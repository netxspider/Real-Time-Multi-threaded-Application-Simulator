// src/components/visualization/StateLegend.jsx
import React from 'react';

const STATES = [
  { label: 'New',        color: '#64748b', desc: 'In Job Queue' },
  { label: 'Ready',      color: '#22c55e', desc: 'Waiting for CPU' },
  { label: 'Running',    color: '#3b82f6', desc: 'On CPU' },
  { label: 'Blocked',    color: '#ef4444', desc: 'Waiting on resource' },
  { label: 'Terminated', color: '#374151', desc: 'Completed' },
];

export default function StateLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {STATES.map(s => (
        <div key={s.label} className="flex items-center gap-1.5" title={s.desc}>
          <div className="w-3 h-3 rounded-full" style={{ background: s.color, boxShadow: `0 0 5px ${s.color}66` }} />
          <span className="text-xs text-gray-500">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
