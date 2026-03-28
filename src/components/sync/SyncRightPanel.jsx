// src/components/sync/SyncRightPanel.jsx
import React, { useRef, useEffect } from 'react';
import { Terminal, Code2, Activity } from 'lucide-react';
import { useSyncStore, CODE_LINES } from '../../store/syncStore';

// ─── Highlight config: which phases highlight which code lines ─────────────────
const PHASE_HIGHLIGHTS = {
  acquire: ['acquire'],
  blocked: ['blocked'],
  in_cs:   ['in_cs'],
  exit:    ['exit'],
  release: ['release'],
  wakeup:  ['wakeup', 'release'],
  idle:    [],
};

// ─── Syntax token types → colors ─────────────────────────────────────────────
function tokenize(code) {
  if (!code.trim()) return [{ text: code, type: 'plain' }];

  const patterns = [
    { type: 'comment', regex: /^(\/\/.*)/  },
    { type: 'keyword', regex: /\b(wait|signal|while|if|lock|unlock|void|bool|class|monitor|procedure|notifyAll|notify|condition|return|true|false)\b/ },
    { type: 'function', regex: /\b(\w+)\s*(?=\()/ },
    { type: 'string',  regex: /(".*?")/ },
    { type: 'number',  regex: /\b(\d+)\b/ },
    { type: 'operator', regex: /([-+*/=<>!&|]+)/ },
  ];

  const tokens = [];
  let rest = code;
  while (rest.length > 0) {
    let matched = false;
    for (const { type, regex } of patterns) {
      const m = rest.match(regex);
      if (m && m.index === 0) {
        tokens.push({ text: m[0], type });
        rest = rest.slice(m[0].length);
        matched = true;
        break;
      } else if (m && m.index !== undefined && m.index > 0) {
        tokens.push({ text: rest.slice(0, m.index), type: 'plain' });
        tokens.push({ text: m[0], type });
        rest = rest.slice(m.index + m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ text: rest[0], type: 'plain' });
      rest = rest.slice(1);
    }
  }
  return tokens;
}

const TOKEN_COLORS = {
  comment:  '#6b7280',
  keyword:  '#a78bfa',
  function: '#60a5fa',
  string:   '#86efac',
  number:   '#fb923c',
  operator: '#f1f5f9',
  plain:    '#d1d5db',
};

// ─── Code Viewer ──────────────────────────────────────────────────────────────
function CodeViewer({ mechanism, highlightPhase }) {
  const lines = CODE_LINES[mechanism] || [];
  const activePhases = PHASE_HIGHLIGHTS[highlightPhase] || [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <Code2 size={13} className="text-violet-400" />
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Live Code</span>
        <span className="ml-auto text-xs text-gray-600 font-mono">
          {mechanism === 'Mutex' ? 'C-style' : mechanism === 'Monitor' ? 'Java-style' : 'POSIX'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-gray-700 bg-gray-950 font-mono text-xs">
        {/* Editor header */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-gray-600 text-xs">
            {mechanism === 'Mutex' ? 'mutex_example.c' :
             mechanism === 'Monitor' ? 'Monitor.java' :
             'semaphore_example.c'}
          </span>
        </div>

        {/* Lines */}
        <div className="p-2 flex flex-col">
          {lines.map((line, idx) => {
            const isHighlighted = line.phase && activePhases.includes(line.phase);
            const tokens = line.code ? tokenize(line.code) : [];

            return (
              <div
                key={idx}
                className={`flex items-center gap-2 px-2 py-0.5 rounded transition-all duration-300 ${
                  isHighlighted
                    ? 'bg-yellow-500/20 border-l-2 border-yellow-400'
                    : 'border-l-2 border-transparent'
                }`}
              >
                {/* Line number */}
                <span className="text-gray-700 select-none w-5 text-right shrink-0 text-xs">
                  {idx + 1}
                </span>

                {/* Code */}
                <span className="flex-1 whitespace-pre overflow-hidden">
                  {line.isComment ? (
                    <span style={{ color: TOKEN_COLORS.comment }}>{line.code}</span>
                  ) : (
                    tokens.map((tok, ti) => (
                      <span key={ti} style={{ color: TOKEN_COLORS[tok.type] }}>
                        {tok.text}
                      </span>
                    ))
                  )}
                </span>

                {/* Highlight annotation */}
                {isHighlighted && (
                  <span className="ml-2 text-yellow-400 text-xs animate-pulse shrink-0">
                    ← {highlightPhase}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── State Variables Display ──────────────────────────────────────────────────
function StateDisplay() {
  const { mechanism, semaphoreValue, capacity, waitQueue, csOccupants, threads } = useSyncStore();

  const isLocked = semaphoreValue === 0;
  const lockColor = isLocked ? '#ef4444' : '#22c55e';

  const waitingThreads = waitQueue.map(id => threads.find(t => t.id === id)).filter(Boolean);
  const csThreads = csOccupants.map(id => threads.find(t => t.id === id)).filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Activity size={13} className="text-violet-400" />
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Memory State</span>
      </div>

      <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 font-mono text-xs flex flex-col gap-2.5">

        {/* Semaphore Value */}
        <div className="flex items-center justify-between">
          <span className="text-gray-500">
            {mechanism === 'Monitor' ? 'occupied' :
             mechanism === 'Mutex' ? 'mutex' : 'S'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black" style={{ color: lockColor }}>
              {mechanism === 'Monitor'
                ? (isLocked ? 'true' : 'false')
                : semaphoreValue}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold border"
              style={{ color: lockColor, borderColor: lockColor + '44', background: lockColor + '12' }}
            >
              {isLocked ? 'LOCKED' : mechanism === 'CountingSemaphore' ? `${semaphoreValue}/${capacity} FREE` : 'UNLOCKED'}
            </span>
          </div>
        </div>

        {mechanism === 'CountingSemaphore' && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">capacity N</span>
            <span className="text-violet-400 font-bold">{capacity}</span>
          </div>
        )}

        <div className="border-t border-gray-800 pt-2 flex flex-col gap-1.5">
          {/* Wait Queue */}
          <div className="flex items-start gap-2">
            <span className="text-gray-500 shrink-0 w-24">waitQueue[]</span>
            <span className="text-gray-300">
              {waitingThreads.length === 0
                ? <span className="text-gray-700">[ ]</span>
                : <span className="text-amber-400">
                    [ {waitingThreads.map(t => t.id).join(', ')} ]
                  </span>
              }
            </span>
          </div>

          {/* CS Occupants */}
          <div className="flex items-start gap-2">
            <span className="text-gray-500 shrink-0 w-24">csOccupants[]</span>
            <span>
              {csThreads.length === 0
                ? <span className="text-gray-700">[ ]</span>
                : <span className="text-indigo-400">
                    [ {csThreads.map(t => t.id).join(', ')} ]
                  </span>
              }
            </span>
          </div>
        </div>

        {/* Visual semaphore bar for counting */}
        {mechanism === 'CountingSemaphore' && (
          <div className="flex gap-1 pt-1">
            {Array.from({ length: capacity }, (_, i) => (
              <div
                key={i}
                className="flex-1 h-4 rounded transition-all duration-300"
                style={{
                  background: i < (capacity - semaphoreValue)
                    ? '#6366f1'
                    : '#1e1e2e',
                  border: '1px solid',
                  borderColor: i < (capacity - semaphoreValue)
                    ? '#818cf8'
                    : '#374151',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Event Log ────────────────────────────────────────────────────────────────
function EventLog() {
  const { logs } = useSyncStore();
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      <div className="flex items-center gap-2">
        <Terminal size={13} className="text-gray-500" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Event Log</span>
        <span className="ml-auto text-xs text-gray-700">{logs.length} events</span>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-950 border border-gray-800 rounded-xl p-2 font-mono text-xs flex flex-col gap-1"
        style={{ minHeight: 80, maxHeight: 160 }}>
        {logs.length === 0 ? (
          <span className="text-gray-700 italic">No events yet…</span>
        ) : (
          logs.map((log, i) => (
            <div key={log.id}
              className={`flex gap-2 text-xs py-0.5 transition-all ${
                i === logs.length - 1 ? 'text-violet-300' : 'text-gray-500'
              }`}>
              <span className="text-gray-700 shrink-0">›</span>
              <span>{log.msg}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ─── Main Right Panel ─────────────────────────────────────────────────────────
export default function SyncRightPanel() {
  const { mechanism, highlightPhase } = useSyncStore();

  return (
    <aside className="w-80 min-w-80 flex flex-col gap-3 bg-gray-900 border-l border-gray-800 p-3 overflow-y-auto h-full">

      {/* State Variables */}
      <StateDisplay />

      {/* Code Viewer */}
      <div className="flex flex-col flex-1 min-h-0" style={{ minHeight: '280px' }}>
        <CodeViewer mechanism={mechanism} highlightPhase={highlightPhase} />
      </div>

      {/* Event Log */}
      <EventLog />
    </aside>
  );
}
