// src/components/scheduling/GanttChart.jsx
import React, { useRef, useEffect } from 'react';
import { useSimStore } from '../../store/simulationStore';

export default function GanttChart() {
  const { ganttEntries, time, userThreads } = useSimStore();
  const scrollRef = useRef(null);

  // Auto-scroll right as time advances
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [time]);

  const PX_PER_TICK = 24;
  const ROW_H = 36;
  const LABEL_W = 48;
  const totalW = Math.max(300, time * PX_PER_TICK + 80);

  // Build a color map from thread id → color
  const colorMap = {};
  for (const t of userThreads) colorMap[t.id] = t.color;

  // Build per-thread rows for a cleaner Gantt
  const threadIds = [...new Set(ganttEntries.map(e => e.threadId))];

  const totalHeight = Math.max(ROW_H + 40, threadIds.length * (ROW_H + 4) + 40);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Gantt Chart</span>
        <div className="flex gap-2 ml-2 flex-wrap">
          {threadIds.map(id => (
            <span key={id} className="flex items-center gap-1 text-xs text-gray-400">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: colorMap[id] || '#6366f1' }} />
              {id}
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-600 ml-auto font-mono">t = {time}</span>
      </div>

      <div ref={scrollRef} className="overflow-x-auto overflow-y-auto flex-1">
        <svg
          width={totalW + LABEL_W}
          height={totalHeight}
          style={{ minWidth: totalW + LABEL_W, minHeight: totalHeight }}
        >
          {/* Single CPU row mode — all threads on one timeline */}
          {/* Row background */}
          <rect x={LABEL_W} y={4} width={totalW} height={ROW_H - 8} rx="4" fill="#13131f" />

          {/* CPU label */}
          <text x={4} y={ROW_H / 2 + 5} fontSize="9" fill="#6b7280" fontWeight="700">CPU</text>

          {/* Gantt blocks */}
          {ganttEntries.map((entry, i) => {
            const x = LABEL_W + entry.start * PX_PER_TICK;
            const bw = Math.max(2, (entry.end - entry.start) * PX_PER_TICK);
            const color = entry.color || colorMap[entry.threadId] || '#6366f1';
            return (
              <g key={i}>
                <rect x={x} y={5} width={bw - 1} height={ROW_H - 10} rx="3"
                  fill={color} opacity="0.88"
                  style={{ transition: 'width 0.1s ease' }}
                />
                {bw > 18 && (
                  <text x={x + bw / 2} y={ROW_H / 2 + 4} textAnchor="middle"
                    fontSize="8" fontWeight="bold" fill="#fff">
                    {entry.threadId}
                  </text>
                )}
                {/* Tick markers at block boundaries */}
                <line
                  x1={x} y1={ROW_H - 2} x2={x} y2={ROW_H + 4}
                  stroke="#3d3d55" strokeWidth="1"
                />
                <text x={x} y={ROW_H + 14} textAnchor="middle"
                  fontSize="7" fill="#4b5563">
                  {entry.start}
                </text>
              </g>
            );
          })}

          {/* End marker for last entry */}
          {ganttEntries.length > 0 && (() => {
            const last = ganttEntries[ganttEntries.length - 1];
            const xEnd = LABEL_W + last.end * PX_PER_TICK;
            return (
              <g key="end-marker">
                <line x1={xEnd} y1={ROW_H - 2} x2={xEnd} y2={ROW_H + 4} stroke="#3d3d55" strokeWidth="1" />
                <text x={xEnd} y={ROW_H + 14} textAnchor="middle" fontSize="7" fill="#4b5563">
                  {last.end}
                </text>
              </g>
            );
          })()}

          {/* Time axis ticks every 5 units */}
          {Array.from({ length: Math.floor(time / 5) + 2 }, (_, i) => i * 5).map(t => (
            <g key={`tick-${t}`}>
              <line
                x1={LABEL_W + t * PX_PER_TICK} y1={ROW_H}
                x2={LABEL_W + t * PX_PER_TICK} y2={ROW_H + 6}
                stroke="#2d2d42" strokeWidth="1"
              />
              <text x={LABEL_W + t * PX_PER_TICK} y={ROW_H + 16}
                textAnchor="middle" fontSize="8" fill="#374151">{t}
              </text>
            </g>
          ))}

          {/* Current time cursor */}
          <line
            x1={LABEL_W + time * PX_PER_TICK} y1={0}
            x2={LABEL_W + time * PX_PER_TICK} y2={ROW_H + 20}
            stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.8"
          />
          <text
            x={LABEL_W + time * PX_PER_TICK} y={ROW_H + 28}
            textAnchor="middle" fontSize="8" fill="#6366f1" fontWeight="bold">
            {time}
          </text>
        </svg>
      </div>
    </div>
  );
}
