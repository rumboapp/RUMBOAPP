/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface NotificationContextValue {
  notify: (message: string, type?: ToastType) => void;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
  notifyWarning: (message: string) => void;
  confirmAction: (options: ConfirmOptions | string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const TOAST_DURATION = 4200;

const TOAST_STYLES: Record<ToastType, { icon: React.ElementType; iconClass: string; barClass: string }> = {
  success: { icon: CheckCircle2, iconClass: 'text-pine', barClass: 'bg-pine' },
  error: { icon: XCircle, iconClass: 'text-rose-620', barClass: 'bg-rose-620' },
  info: { icon: Info, iconClass: 'text-ocean', barClass: 'bg-ocean' },
  warning: { icon: AlertTriangle, iconClass: 'text-orange-850', barClass: 'bg-yellow-101' },
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const notify = useCallback((message: string, type: ToastType = 'info') => {
    const id = 'toast-' + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    timers.current[id] = setTimeout(() => dismissToast(id), TOAST_DURATION);
  }, [dismissToast]);

  const notifySuccess = useCallback((message: string) => notify(message, 'success'), [notify]);
  const notifyError = useCallback((message: string) => notify(message, 'error'), [notify]);
  const notifyInfo = useCallback((message: string) => notify(message, 'info'), [notify]);
  const notifyWarning = useCallback((message: string) => notify(message, 'warning'), [notify]);

  // Confirmation modal state
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirmAction = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const normalized: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setConfirmState({ options: normalized, resolve });
    });
  }, []);

  const handleConfirmClose = (value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ notify, notifySuccess, notifyError, notifyInfo, notifyWarning, confirmAction }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2.5 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map(toast => {
          const style = TOAST_STYLES[toast.type];
          const Icon = style.icon;
          return (
            <div
              key={toast.id}
              className="pointer-events-auto relative overflow-hidden bg-white rounded-xl shadow-pop border border-gray-405/20 flex items-start gap-3 p-4 pr-10 animate-toast-in"
              role="status"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.barClass}`} />
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconClass}`} />
              <p className="text-sm font-medium text-gray-850 leading-snug">{toast.message}</p>
              <button
                onClick={() => dismissToast(toast.id)}
                className="absolute top-3 right-3 text-gray-405 hover:text-gray-512 transition-colors"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation modal */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-overlay-in"
          onClick={() => handleConfirmClose(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-pop max-w-sm w-full p-6 animate-modal-in"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${confirmState.options.destructive ? 'bg-rose-620/10' : 'bg-pine/10'}`}>
              {confirmState.options.destructive
                ? <AlertTriangle className="w-5.5 h-5.5 text-rose-620" />
                : <Info className="w-5.5 h-5.5 text-pine" />
              }
            </div>
            {confirmState.options.title && (
              <h3 className="text-lg font-bold text-gray-850 mb-1.5">{confirmState.options.title}</h3>
            )}
            <p className="text-sm text-gray-512 leading-relaxed mb-6">{confirmState.options.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-512 hover:bg-sky transition-colors"
              >
                {confirmState.options.cancelLabel || 'Cancelar'}
              </button>
              <button
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                  confirmState.options.destructive ? 'bg-rose-620 hover:bg-rose-655' : 'bg-pine hover:bg-pine-hover'
                }`}
              >
                {confirmState.options.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification debe usarse dentro de NotificationProvider');
  }
  return ctx;
}
