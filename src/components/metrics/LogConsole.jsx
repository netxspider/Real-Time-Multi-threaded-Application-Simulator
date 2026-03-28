// src/components/metrics/LogConsole.jsx
import React, { useRef, useEffect } from 'react';
import { useSimStore } from '../../store/simulationStore';
import { Terminal } from 'lucide-react';

export default function LogConsole() {
  const { eventLogs } = useSimStore();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventLogs.length]);

  const getColor = (text) => {
    if (text.includes('RUNNING')) return '#60a5fa';
    if (text.includes('BLOCKED')) return '#f87171';
    if (text.includes('READY') || text.includes('UNBLOCKED')) return '#4ade80';
    if (text.includes('TERMINATED')) return '#6b7280';
    if (text.includes('STARTED') || text.includes('RESUMED')) return '#a78bfa';
    if (text.includes('PAUSED') || text.includes('STOPPED')) return '#f59e0b';
    if (text.includes('RESET') || text.includes('created')) return '#94a3b8';
    if (text.includes('preempted')) return '#fb923c';
    return '#6b7280';
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 mb-2">
        <Terminal size={12} className="text-gray-500" />
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Event Log</span>
        <span className="ml-auto text-xs text-gray-700">{eventLogs.length} events</span>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-950 rounded-lg border border-gray-800 p-2 font-mono">
        {eventLogs.length === 0 ? (
          <p className="text-xs text-gray-700 italic p-1">No events yet. Start the simulation.</p>
        ) : (
          eventLogs.map(log => (
            <div key={log.id} className="text-xs py-0.5 log-entry leading-5" style={{ color: getColor(log.text) }}>
              {log.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
