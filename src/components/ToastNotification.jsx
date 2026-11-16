import React from 'react';

export default function ToastNotification({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      maxWidth: 'min(380px, calc(100vw - 2rem))',
      width: '100%',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => {
        let bg = 'rgba(21, 28, 44, 0.96)';
        let border = 'var(--accent-cyan)';
        let icon = 'fa-info-circle';
        let color = 'var(--accent-cyan)';

        if (toast.type === 'success') {
          border = 'var(--accent-emerald)';
          icon = 'fa-circle-check';
          color = 'var(--accent-emerald)';
        } else if (toast.type === 'error') {
          border = 'var(--accent-rose)';
          icon = 'fa-circle-xmark';
          color = 'var(--accent-rose)';
        } else if (toast.type === 'warning') {
          border = 'var(--accent-amber)';
          icon = 'fa-triangle-exclamation';
          color = 'var(--accent-amber)';
        }

        return (
          <div
            key={toast.id}
            className="animate-fade-in"
            style={{
              background: bg,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderLeft: `4px solid ${border}`,
              borderTop: '1px solid var(--border-subtle)',
              borderRight: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1.1rem',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-card)',
              pointerEvents: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              <i className={`fa-solid ${icon}`} style={{ color, fontSize: '1.1rem', flexShrink: 0 }}></i>
              <span style={{ fontSize: '0.9rem', fontWeight: 500, wordBreak: 'break-word' }}>{toast.message}</span>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-subdued)',
                cursor: 'pointer',
                padding: '0.25rem',
                marginLeft: '0.75rem',
                flexShrink: 0
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
}
