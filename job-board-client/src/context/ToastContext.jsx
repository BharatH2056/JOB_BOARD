import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ message, type = 'info', duration = 3500 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg) => addToast({ message: msg, type: 'success' }), [addToast]);
  const error = useCallback((msg) => addToast({ message: msg, type: 'error', duration: 5000 }), [addToast]);
  const warning = useCallback((msg) => addToast({ message: msg, type: 'warning' }), [addToast]);
  const info = useCallback((msg) => addToast({ message: msg, type: 'info' }), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, success, error, warning, info }}>
      {children}
      <div className="toast-container" style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
        maxWidth: '400px',
        width: 'calc(100% - 48px)',
      }}>
        {toasts.map((t) => {
          let bg = 'var(--bg-elevated)';
          let border = 'var(--border-strong)';
          let icon = <Info size={18} color="var(--blue)" />;
          if (t.type === 'success') {
            border = 'rgba(52, 211, 153, 0.4)';
            icon = <CheckCircle size={18} color="var(--green)" />;
          } else if (t.type === 'error') {
            border = 'rgba(248, 113, 113, 0.4)';
            icon = <AlertCircle size={18} color="var(--red)" />;
          } else if (t.type === 'warning') {
            border = 'rgba(251, 191, 36, 0.4)';
            icon = <AlertTriangle size={18} color="var(--yellow)" />;
          }

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: bg,
                border: `1px solid ${border}`,
                boxShadow: 'var(--shadow-lg)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                animation: 'slideUp 0.2s ease-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {icon}
                <span>{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
