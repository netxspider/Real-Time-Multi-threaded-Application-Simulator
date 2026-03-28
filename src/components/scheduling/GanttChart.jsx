// src/components/scheduling/GanttChart.jsx
import React, { useRef, useEffect, useState } from 'react';
import { useSimStore } from '../../store/simulationStore';
import SchedulingTableModal from './SchedulingTableModal';
import { TableIcon } from 'lucide-react';

const PX_PER_TICK = 28;
const ROW_H = 40;
const LABEL_W = 52;
const TIME_AXIS_H = 28; // space below row for time labels

export default function GanttChart() {
  const { ganttEntries, time, userThreads, simulationCompleted } = useSimStore();
  const scrollRef = useRef(null);
  const [showTable, setShowTable] = useState(false);

  // Auto-scroll right while simulation runs
  useEffect(() => {
    if (!simulationCompleted && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [time, simulationCompleted]);

  // Build color map
  const colorMap = {};
  for (const t of userThreads) colorMap[t.id] = t.color;

  // Collect all unique time boundaries for tick marks
  const boundaries = new Set([0]);
  for (const e of ganttEntries) {
    boundaries.add(e.start);
    boundaries.add(e.end);
  }
  const sortedBounds = [...boundaries].sort((a, b) => a - b);

  // Total SVG width — span from 0 to the last end time
  const lastEnd = ganttEntries.length > 0
    ? Math.max(...ganttEntries.map(e => e.end))
    : Math.max(time, 1);
  const svgW = LABEL_W + lastEnd * PX_PER_TICK + 40;
  const svgH = ROW_H + TIME_AXIS_H;

  // Legend: unique threads in gantt order
  const seenIds = new Set();
  const legendIds = [];
  for (const e of ganttEntries) {
    if (!seenIds.has(e.threadId)) { seenIds.add(e.threadId); legendIds.push(e.threadId); }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Gantt Chart</span>
        {/* Thread legend chips */}
        <div className="flex gap-2 ml-2 flex-wrap">
          {legendIds.map(id => (
            <span key={id} className="flex items-center gap-1 text-xs text-gray-400">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: colorMap[id] || '#6366f1' }} />
              {id}
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-600 ml-auto font-mono">
          {simulationCompleted ? 'Complete' : `t = ${time}`}
        </span>
      </div>

      {/* Scrollable SVG area */}
      <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden flex-1 min-h-0">
        <svg
          width={svgW}
          height={svgH}
          style={{ minWidth: svgW, display: 'block' }}
        >
          {/* Row background */}
          <rect x={LABEL_W} y={4} width={svgW - LABEL_W - 4} height={ROW_H - 8} rx="5" fill="#0d0d1a" />

          {/* CPU row label */}
          <text x={4} y={ROW_H / 2 + 5} fontSize="9" fill="#6b7280" fontWeight="700" letterSpacing="0.5">CPU</text>

          {/* ── Gantt blocks ── */}
          {ganttEntries.map((entry, i) => {
            const x = LABEL_W + entry.start * PX_PER_TICK;
            const bw = (entry.end - entry.start) * PX_PER_TICK;
            const color = entry.color || colorMap[entry.threadId] || '#6366f1';
            const blockH = ROW_H - 12;
            const blockY = 6;
            const midX = x + bw / 2;
            const midY = blockY + blockH / 2 + 4;

            return (
              <g key={i}>
                {/* Block body */}
                <rect
                  x={x + 0.5} y={blockY}
                  width={Math.max(bw - 1, 1)} height={blockH}
                  rx="4"
                  fill={color}
                  fillOpacity="0.85"
                  stroke={color}
                  strokeWidth="0.5"
                  strokeOpacity="0.5"
                />
                {/* Thread name — only if block wide enough */}
                {bw >= 22 && (
                  <text
                    x={midX} y={midY - 4}
                    textAnchor="middle"
                    fontSize="9" fontWeight="bold" fill="#fff"
                    style={{ pointerEvents: 'none' }}
                  >
                    {entry.threadId}
                  </text>
                )}
                {/* Entry time at left edge of block */}
                <line x1={x} y1={blockY + blockH} x2={x} y2={blockY + blockH + 6} stroke="#3d3d55" strokeWidth="1" />
                <text
                  x={x} y={blockY + blockH + 16}
                  textAnchor="middle"
                  fontSize="8" fill="#6b7280"
                >
                  {entry.start}
                </text>
              </g>
            );
          })}

          {/* ── End marker & exit time for last block ── */}
          {ganttEntries.length > 0 && (() => {
            const last = ganttEntries[ganttEntries.length - 1];
            const xEnd = LABEL_W + last.end * PX_PER_TICK;
            return (
              <g>
                <line x1={xEnd} y1={6} x2={xEnd} y2={ROW_H - 2} stroke="#4b5563" strokeWidth="1.5" />
                <line x1={xEnd} y1={ROW_H - 2} x2={xEnd} y2={ROW_H + 6} stroke="#3d3d55" strokeWidth="1" />
                <text x={xEnd} y={ROW_H + 16} textAnchor="middle" fontSize="8" fill="#6b7280">
                  {last.end}
                </text>
              </g>
            );
          })()}

          {/* ── Live cursor (only while running) ── */}
          {!simulationCompleted && (
            <line
              x1={LABEL_W + time * PX_PER_TICK} y1={2}
              x2={LABEL_W + time * PX_PER_TICK} y2={ROW_H - 2}
              stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7"
            />
          )}
        </svg>
      </div>

      {/* ── CPU Scheduling Table button — shown only after completion ── */}
      {simulationCompleted && (
        <div className="shrink-0 px-3 py-2 border-t border-gray-800 flex justify-center">
          <button
            onClick={() => setShowTable(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-900/40"
          >
            <TableIcon size={14} />
            CPU Scheduling Table
          </button>
        </div>
      )}

      {/* Modal */}
      {showTable && <SchedulingTableModal onClose={() => setShowTable(false)} />}
    </div>
  );
}
