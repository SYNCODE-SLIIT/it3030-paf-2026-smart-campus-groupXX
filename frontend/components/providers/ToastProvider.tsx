'use client';

import React from 'react';
import { Toast, ToastStack } from '@/components/ui/Toast';

type ToastVariant = 'error' | 'success' | 'warning' | 'info' | 'neutral';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message: string;
}

interface ToastContextValue {
  showToast: (variant: ToastVariant, title: string, message: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = React.useCallback((variant: ToastVariant, title: string, message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, variant, title, message }]);
    const delay = variant === 'error' || variant === 'warning' ? 7000 : 4600;
    window.setTimeout(() => removeToast(id), delay);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastStack>
        {toasts.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            title={t.title}
            dismissible
            onDismiss={() => removeToast(t.id)}
          >
            {t.message}
          </Toast>
        ))}
      </ToastStack>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
