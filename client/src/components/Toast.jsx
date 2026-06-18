import { useState, useEffect, useCallback } from 'react';

let toastId = 0;

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, icon = '⚡') => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-4), { id, message, icon, exiting: false }]);

    // Auto remove after 3.5s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3500);
  }, []);

  return { toasts, addToast };
}

export default function ToastContainer({ toasts }) {
  return (
    <div className="toast-container" id="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.exiting ? 'toast-exit' : ''}`}
        >
          <span className="toast-icon">{toast.icon}</span>
          <span className="toast-text">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
