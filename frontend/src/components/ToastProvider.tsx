"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type Toast = { id: string; message: string; level?: 'info' | 'success' | 'error' };

const ToastContext = createContext<{ push: (t: Omit<Toast,'id'>) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function push(t: Omit<Toast,'id'>) {
    const toast: Toast = { id: String(Date.now()) + Math.random().toString(36).slice(2), ...t };
    setToasts((s) => [toast, ...s]);
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== toast.id)), 4200);
  }

  // expose simple global event as well
  useEffect(() => {
    const h = (e: Event) => {
      const detail = (e as CustomEvent).detail as any;
      if (!detail || !detail.message) return;
      push({ message: detail.message, level: detail.level || 'info' });
    };
    window.addEventListener('aegis:toast', h as EventListener);
    return () => window.removeEventListener('aegis:toast', h as EventListener);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div aria-live="polite" className="fixed right-4 top-4 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div key={t.id} className={`max-w-sm rounded-lg px-4 py-2 shadow-sm text-sm ${t.level === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100' : t.level === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-800 border border-slate-100'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
