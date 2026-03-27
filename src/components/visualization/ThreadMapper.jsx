// src/components/visualization/ThreadMapper.jsx
import React, { useRef, useEffect, useState } from 'react';
import { useSimStore } from '../../store/simulationStore';

const STATE_COLORS = {
  NEW: '#64748b',
  READY: '#22c55e',
  RUNNING: '#3b82f6',
  BLOCKED: '#ef4444',
  TERMINATED: '#1f2937',
};

const STATE_GLOW = {
  NEW: 'none',
  READY: '0 0 10px #22c55e88',
  RUNNING: '0 0 16px #3b82f6cc',
  BLOCKED: '0 0 10px #ef444488',
  TERMINATED: 'none',
};

const THREAD_R = 14;

export default function ThreadMapper() {
  const { userThreads, kernelThreads, mappings, cpuCurrentThread, model } = useSimStore();
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ w: 600, h: 300 });

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const e = entries[0];
      setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    if (svgRef.current) obs.observe(svgRef.current);
    return () => obs.disconnect();
  }, []);

  const { w, h } = dims;
  const padX = 40;
  const colUser = padX + 40;
  const colKernel = w / 2;
  const colCPU = w - padX - 40;

  // Layout user threads
  const userPositions = userThreads.map((t, i) => {
    const total = userThreads.length;
    const spacing = Math.min(40, (h - 60) / Math.max(total, 1));
    const startY = (h - spacing * (total - 1)) / 2;
    return { x: colUser, y: startY + i * spacing, thread: t };
  });

  // Layout kernel threads
  const kernelPositions = kernelThreads.map((k, i) => {
    const total = kernelThreads.length;
    const spacing = Math.min(48, (h - 60) / Math.max(total, 1));
    const startY = (h - spacing * (total - 1)) / 2;
    return { x: colKernel, y: startY + i * spacing, thread: k };
  });

  // CPU box position
  const cpuY = h / 2;

  // Build kernel positions map
  const kernelPosMap = {};
  for (const kp of kernelPositions) kernelPosMap[kp.thread.id] = kp;

  return (
    <div ref={svgRef} className="w-full h-full">
      <svg width={w} height={h} className="overflow-visible">
        <defs>
          <filter id="glow-running">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-blocked">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#4f46e5" />
          </marker>
        </defs>

        {/* ── User → Kernel lines ── */}
        {userPositions.map(({ x, y, thread }) => {
          const kId = mappings[thread.id];
          const kPos = kernelPosMap[kId];
          if (!kPos) return null;
          const isActive = thread.state === 'RUNNING' || thread.state === 'READY';
          return (
            <line
              key={`uk-${thread.id}`}
              x1={x + THREAD_R} y1={y} x2={kPos.x - THREAD_R} y2={kPos.y}
              stroke={isActive ? '#4f46e5' : '#2d2d42'}
              strokeWidth={isActive ? 2 : 1}
              strokeDasharray={isActive ? '6 3' : '4 4'}
              className={isActive ? 'flow-line' : ''}
              opacity={thread.state === 'TERMINATED' ? 0.2 : 0.7}
            />
          );
        })}

        {/* ── Kernel → CPU lines ── */}
        {kernelPositions.map(({ x, y, thread }) => {
          const hasActive = userThreads.some(
            u => mappings[u.id] === thread.id && u.state === 'RUNNING'
          );
          return (
            <line
              key={`kc-${thread.id}`}
              x1={x + THREAD_R} y1={y} x2={colCPU - 36} y2={cpuY}
              stroke={hasActive ? '#6366f1' : '#2d2d42'}
              strokeWidth={hasActive ? 2.5 : 1}
              strokeDasharray={hasActive ? '5 2' : '3 5'}
              className={hasActive ? 'flow-line' : ''}
              opacity={hasActive ? 0.9 : 0.3}
            />
          );
        })}

        {/* ── User Thread circles ── */}
        {userPositions.map(({ x, y, thread }) => {
          const color = STATE_COLORS[thread.state] || '#64748b';
          const isRunning = thread.state === 'RUNNING';
          const isBlocked = thread.state === 'BLOCKED';
          const isTerminated = thread.state === 'TERMINATED';
          return (
            <g key={thread.id} transform={`translate(${x}, ${y})`}>
              {isRunning && (
                <circle r={THREAD_R + 6} fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.4"
                  className="pulse-ring" />
              )}
              <circle
                r={THREAD_R} fill={isTerminated ? '#111118' : color}
                stroke={isTerminated ? '#374151' : color}
                strokeWidth="2"
                opacity={isTerminated ? 0.4 : 1}
                filter={isRunning ? 'url(#glow-running)' : isBlocked ? 'url(#glow-blocked)' : ''}
              />
              <text textAnchor="middle" dominantBaseline="central"
                fontSize="8" fontWeight="bold"
                fill={isTerminated ? '#4b5563' : '#fff'}
              >
                {thread.id}
              </text>
              {/* Remaining time bar */}
              {!isTerminated && thread.state !== 'NEW' && (
                <g transform={`translate(-${THREAD_R}, ${THREAD_R + 4})`}>
                  <rect width={THREAD_R * 2} height="3" rx="1.5" fill="#1e1e2e" />
                  <rect
                    width={Math.max(0, (thread.remainingTime / thread.burstTime) * THREAD_R * 2)}
                    height="3" rx="1.5" fill={color} opacity="0.9"
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* ── Kernel Thread circles ── */}
        {kernelPositions.map(({ x, y, thread }) => {
          const hasRunning = userThreads.some(
            u => mappings[u.id] === thread.id && u.state === 'RUNNING'
          );
          return (
            <g key={thread.id} transform={`translate(${x}, ${y})`}>
              <circle r={12} fill={hasRunning ? '#7c3aed' : '#1e1e2e'}
                stroke={hasRunning ? '#a78bfa' : '#3d3d55'} strokeWidth="2"
                filter={hasRunning ? 'url(#glow-running)' : ''} />
              <text textAnchor="middle" dominantBaseline="central"
                fontSize="7" fontWeight="bold" fill={hasRunning ? '#fff' : '#6b7280'}>
                {thread.id}
              </text>
            </g>
          );
        })}

        {/* ── CPU Box ── */}
        <g transform={`translate(${colCPU}, ${cpuY})`}>
          <rect x="-36" y="-28" width="72" height="56" rx="10"
            fill={cpuCurrentThread ? '#1e3a8a' : '#1e1e2e'}
            stroke={cpuCurrentThread ? '#3b82f6' : '#3d3d55'}
            strokeWidth="2"
            filter={cpuCurrentThread ? 'url(#glow-running)' : ''}
          />
          <text textAnchor="middle" y="-10" fontSize="8" fill="#6b7280" fontWeight="600">CPU</text>
          <text textAnchor="middle" y="6" fontSize="11" fontWeight="bold"
            fill={cpuCurrentThread ? '#93c5fd' : '#4b5563'}>
            {cpuCurrentThread ?? '—'}
          </text>
          {cpuCurrentThread && (
            <circle r="4" cx="24" cy="-18" fill="#22c55e" className="pulse-ring" />
          )}
        </g>

        {/* ── Column Labels ── */}
        <text x={colUser} y={16} textAnchor="middle" fontSize="9" fill="#6b7280" fontWeight="600" letterSpacing="1">
          USER THREADS
        </text>
        <text x={colKernel} y={16} textAnchor="middle" fontSize="9" fill="#6b7280" fontWeight="600" letterSpacing="1">
          KERNEL THREADS
        </text>
        <text x={colCPU} y={16} textAnchor="middle" fontSize="9" fill="#6b7280" fontWeight="600" letterSpacing="1">
          CPU
        </text>

        {/* ── Model label ── */}
        <text x={w / 2} y={h - 6} textAnchor="middle" fontSize="9" fill="#4b5563">
          Model: {model}
        </text>
      </svg>
    </div>
  );
}
