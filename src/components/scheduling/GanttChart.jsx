// src/components/scheduling/GanttChart.jsx
import React, { useRef, useEffect } from 'react';
import { useSimStore } from '../../store/simulationStore';

export default function GanttChart() {
  const { ganttEntries, time } = useSimStore();
  const scrollRef = useRef(null);

  // Auto-scroll right as time advances
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [time]);

  const PX_PER_TICK = 20;
  const ROW_H = 32;
  const LABEL_W = 40;
  const totalW = Math.max(300, time * PX_PER_TICK + 60);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Gantt Chart</span>
        <span className="text-xs text-gray-600 ml-auto">t = {time}</span>
      </div>

      <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden flex-1">
        <svg width={totalW + LABEL_W} height={ROW_H + 30} style={{ minWidth: totalW + LABEL_W }}>
          {/* CPU row label */}
          <text x={4} y={ROW_H / 2 + 5} fontSize="9" fill="#6b7280" fontWeight="600">CPU</text>

          {/* Row background */}
          <rect x={LABEL_W} y={4} width={totalW} height={ROW_H - 8} rx="4" fill="#1a1a24" />

          {/* Gantt blocks */}
          {ganttEntries.map((entry, i) => {
            const x = LABEL_W + entry.start * PX_PER_TICK;
            const w = Math.max(2, (entry.end - entry.start) * PX_PER_TICK);
            return (
              <g key={i}>
                <rect x={x} y={5} width={w - 1} height={ROW_H - 10} rx="3"
                  fill={entry.color} opacity="0.85" />
                {w > 20 && (
                  <text x={x + w / 2} y={ROW_H / 2 + 4} textAnchor="middle"
                    fontSize="8" fontWeight="bold" fill="#fff">
                    {entry.threadId}
                  </text>
                )}
              </g>
            );
          })}

          {/* Time axis */}
          {Array.from({ length: Math.floor(time / 5) + 2 }, (_, i) => i * 5).map(t => (
            <g key={t}>
              <line x1={LABEL_W + t * PX_PER_TICK} y1={ROW_H} x2={LABEL_W + t * PX_PER_TICK} y2={ROW_H + 6}
                stroke="#3d3d55" strokeWidth="1" />
              <text x={LABEL_W + t * PX_PER_TICK} y={ROW_H + 16} textAnchor="middle"
                fontSize="8" fill="#4b5563">{t}</text>
            </g>
          ))}

          {/* Current time cursor */}
          <line x1={LABEL_W + time * PX_PER_TICK} y1={0} x2={LABEL_W + time * PX_PER_TICK} y2={ROW_H + 20}
            stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.8" />
        </svg>
      </div>
    </div>
  );
}
