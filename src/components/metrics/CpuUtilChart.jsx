// src/components/metrics/CpuUtilChart.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useSimStore } from '../../store/simulationStore';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs shadow-xl">
        <p className="text-indigo-400 font-bold">{payload[0].value}% CPU</p>
        <p className="text-gray-500">t = {payload[0]?.payload?.t}</p>
      </div>
    );
  }
  return null;
};

export default function CpuUtilChart() {
  const { cpuUtilHistory } = useSimStore();
  const recent = cpuUtilHistory.slice(-60);
  const lastUtil = recent[recent.length - 1]?.util ?? 0;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">CPU Utilization</span>
        <span
          className="text-sm font-bold"
          style={{ color: lastUtil > 70 ? '#22c55e' : lastUtil > 30 ? '#f59e0b' : '#ef4444' }}
        >
          {lastUtil}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={recent} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
          <XAxis dataKey="t" tick={{ fill: '#4b5563', fontSize: 9 }} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={{ fill: '#4b5563', fontSize: 9 }} />
          <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="3 3" opacity={0.4} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="util"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
