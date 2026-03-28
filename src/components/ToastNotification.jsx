// src/components/ToastNotification.jsx
import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export default function ToastNotification({ show, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (show) {
      setExiting(false);
      setVisible(true);

      const autoTimer = setTimeout(() => {
        dismiss();
      }, 4000);

      return () => clearTimeout(autoTimer);
    }
  }, [show]);

  function dismiss() {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onDismiss?.();
    }, 350);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        animation: exiting
          ? 'toast-slide-out 0.35s ease-in forwards'
          : 'toast-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #0f2e1a 0%, #0a1f10 100%)',
          border: '1px solid rgba(34, 197, 94, 0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,197,94,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
          minWidth: 300,
          maxWidth: 380,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CheckCircle2 size={18} color="#22c55e" strokeWidth={2.5} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#dcfce7', lineHeight: 1.3 }}>
            Simulation Complete
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#86efac', lineHeight: 1.4 }}>
            All threads have been successfully terminated.
          </p>
          {/* Progress bar */}
          <div
            style={{
              marginTop: 10,
              height: 2,
              borderRadius: 1,
              background: 'rgba(34,197,94,0.2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #22c55e, #4ade80)',
                borderRadius: 1,
                animation: 'toast-progress 4s linear forwards',
                transformOrigin: 'left',
              }}
            />
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={dismiss}
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4ade80',
            padding: 0,
            flexShrink: 0,
            opacity: 0.7,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
        >
          <X size={13} />
        </button>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes toast-slide-in {
          from { transform: translateX(calc(100% + 24px)); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes toast-slide-out {
          from { transform: translateX(0); opacity: 1; }
          to   { transform: translateX(calc(100% + 24px)); opacity: 0; }
        }
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
