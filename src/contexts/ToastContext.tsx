import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'info' | 'error';
}

interface ToastContextValue {
  toast: (message: string, type?: 'info' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let id = 0;
function nextId() {
  return `toast-${++id}`;
}

const TOAST_DURATION_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const t = timeoutsRef.current.get(id);
    if (t) clearTimeout(t);
    timeoutsRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: 'info' | 'error' = 'info') => {
      const item: ToastItem = { id: nextId(), message, type };
      setToasts((prev) => [...prev, item]);
      const timeout = setTimeout(() => removeToast(item.id), TOAST_DURATION_MS);
      timeoutsRef.current.set(item.id, timeout);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[min(100vw-2rem,24rem)]"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`relative rounded-lg border px-4 py-3 pr-10 shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4 fade-in ${
            t.type === 'error'
              ? 'bg-rose-950/95 border-rose-600 text-rose-100'
              : 'bg-slate-800/95 border-slate-600 text-slate-100'
          }`}
        >
          <p>{t.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="absolute top-2 right-2 p-1 rounded text-slate-400 hover:text-white"
            aria-label="Dismiss"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
