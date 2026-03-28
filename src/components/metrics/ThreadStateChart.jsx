// src/components/metrics/ThreadStateChart.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSimStore } from '../../store/simulationStore';

const STATE_META = [
  { state: 'NEW',        color: '#64748b', label: 'New' },
  { state: 'READY',      color: '#22c55e', label: 'Ready' },
  { state: 'RUNNING',    color: '#3b82f6', label: 'Run' },
  { state: 'TERMINATED', color: '#4b5563', label: 'Done' },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs shadow-xl">
        <p style={{ color: payload[0].payload.color }} className="font-bold">
          {payload[0].payload.state}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export default function ThreadStateChart() {
  const { userThreads } = useSimStore();

  const data = STATE_META.map(m => ({
    ...m,
    count: userThreads.filter(t => t.state === m.state).length,
  }));

  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Thread States</span>
      {/* Pill summary */}
      <div className="flex gap-1.5 flex-wrap">
        {data.map(d => (
          <div key={d.state} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ background: d.color + '22', border: `1px solid ${d.color}55`, color: d.color }}>
            <span className="font-bold">{d.count}</span>
            <span className="opacity-70">{d.label}</span>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={90}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 9 }} />
          <YAxis allowDecimals={false} tick={{ fill: '#4b5563', fontSize: 9 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map(d => <Cell key={d.state} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
