// src/components/controls/ThreadConfigModal.jsx
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { useSimStore } from '../../store/simulationStore';

export default function ThreadConfigModal({ onClose }) {
  const {
    threadConfigs, algorithm, isRunning, isPaused, updateThreadConfig, userThreads,
  } = useSimStore();

  const showPriority = algorithm === 'Priority';

  // Local draft copy so changes only apply on Save
  const [draft, setDraft] = useState(() =>
    threadConfigs.map(c => ({
      ...c,
      arrivalTime: String(c.arrivalTime),
      burstTime:   String(c.burstTime),
      priority:    String(c.priority ?? 1),
    }))
  );

  // Keep draft in sync if threadConfigs changes while modal is open
  useEffect(() => {
    setDraft(threadConfigs.map(c => ({
      ...c,
      arrivalTime: String(c.arrivalTime),
      burstTime:   String(c.burstTime),
      priority:    String(c.priority ?? 1),
    })));
  }, [threadConfigs]);

  const simActive = isRunning || isPaused || userThreads.length > 0;
  const readOnly  = simActive;

  function handleChange(id, field, val) {
    if (readOnly) return;
    setDraft(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  }

  function handleSave() {
    if (readOnly) { onClose(); return; }
    draft.forEach(row => {
      const arrival  = Math.max(0, parseInt(row.arrivalTime, 10) || 0);
      const burst    = Math.max(1, parseInt(row.burstTime, 10) || 1);
      const priority = Math.max(1, parseInt(row.priority, 10) || 1);
      updateThreadConfig(row.id, 'arrivalTime', arrival);
      updateThreadConfig(row.id, 'burstTime',   burst);
      updateThreadConfig(row.id, 'priority',    priority);
    });
    onClose();
  }

  function handleReset() {
    if (readOnly) return;
    setDraft(prev => prev.map((r, i) => ({
      ...r,
      arrivalTime: '0',
      burstTime:   '5',
      priority:    String(i + 1),
    })));
  }

  // Shared input class builder
  const inputClass = (extra = '') =>
    `w-full bg-gray-800 border text-gray-100 text-xs rounded-md px-2.5 py-1.5 font-mono focus:outline-none transition-colors ${
      readOnly
        ? 'border-gray-700 opacity-50 cursor-not-allowed'
        : 'border-gray-700 hover:border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
    } ${extra}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col rounded-2xl border border-gray-700 shadow-2xl"
        style={{
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
          width: showPriority ? 540 : 480,
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
          <div>
            <h2 className="text-sm font-bold text-gray-100 tracking-wide">Thread Configuration</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Set arrival &amp; burst times{showPriority ? ', and priority for each thread' : ' for each thread'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Warning banner when read-only */}
        {readOnly && (
          <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/30 border border-amber-700/40 text-amber-300 text-xs">
            <AlertTriangle size={13} className="shrink-0" />
            <span>Reset the simulation to edit thread configuration.</span>
          </div>
        )}

        {/* Priority mode hint */}
        {showPriority && !readOnly && (
          <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-900/20 border border-violet-700/30 text-violet-300 text-xs">
            <span className="shrink-0">★</span>
            <span>Priority values are editable below. Use the mode toggle in the sidebar to define which value wins.</span>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-widest pb-2 pr-3 w-16">Thread</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-widest pb-2 pr-3">Arrival</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-widest pb-2 pr-3">Burst</th>
                {showPriority && (
                  <th className="text-left text-xs font-semibold text-violet-500 uppercase tracking-widest pb-2">Priority</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {draft.map((row, idx) => (
                <tr key={row.id} className="group">
                  {/* Thread ID */}
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: `hsl(${(idx * 47) % 360}, 70%, 25%)`,
                          color: `hsl(${(idx * 47) % 360}, 70%, 70%)`,
                          border: `1.5px solid hsl(${(idx * 47) % 360}, 70%, 50%)`,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-mono text-xs text-gray-300">{row.id}</span>
                    </div>
                  </td>

                  {/* Arrival Time */}
                  <td className="py-2 pr-3">
                    <div className="relative">
                      <input
                        type="number" min={0}
                        value={row.arrivalTime}
                        onChange={e => handleChange(row.id, 'arrivalTime', e.target.value)}
                        readOnly={readOnly}
                        className={inputClass()}
                        style={{ appearance: 'textfield' }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-xs pointer-events-none">t</span>
                    </div>
                  </td>

                  {/* Burst Time */}
                  <td className={`py-2 ${showPriority ? 'pr-3' : ''}`}>
                    <div className="relative">
                      <input
                        type="number" min={1}
                        value={row.burstTime}
                        onChange={e => handleChange(row.id, 'burstTime', e.target.value)}
                        readOnly={readOnly}
                        className={inputClass()}
                        style={{ appearance: 'textfield' }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-xs pointer-events-none">τ</span>
                    </div>
                  </td>

                  {/* Priority (only for Priority algorithm) */}
                  {showPriority && (
                    <td className="py-2">
                      <div className="relative">
                        <input
                          type="number" min={1} max={99}
                          value={row.priority}
                          onChange={e => handleChange(row.id, 'priority', e.target.value)}
                          readOnly={readOnly}
                          className={inputClass('focus:border-violet-500 focus:ring-violet-500')}
                          style={{ appearance: 'textfield' }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-violet-700 text-xs pointer-events-none">★</span>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-700/60 gap-2">
          {!readOnly ? (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
            >
              <RotateCcw size={12} />
              Reset Defaults
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <Check size={12} />
              {readOnly ? 'Close' : 'Save & Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
