import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface SignInModalProps {
  onClose: () => void;
}

export function SignInModal({ onClose }: SignInModalProps) {
  const { signInWithPassword, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!email.trim() || !password) {
      setMessage('Enter email and password.');
      return;
    }
    setBusy(true);
    let busyClearedBeforeUnmount = false;
    try {
      const { error } =
        mode === 'signin' ? await signInWithPassword(email, password) : await signUp(email, password);
      if (error) {
        setMessage(error.message);
        return;
      }
      if (mode === 'signup') {
        toast(
          'If your project requires email confirmation, check your inbox before signing in.',
          'info'
        );
      }
      setBusy(false);
      busyClearedBeforeUnmount = true;
      onClose();
    } finally {
      if (!busyClearedBeforeUnmount) {
        setBusy(false);
      }
    }
  };

  /** Portal avoids `position:fixed` being scoped to a `backdrop-blur` header ancestor (clips dialog to top bar). */
  return createPortal(
    <div
      className="fixed inset-0 z-60 flex min-h-dvh items-center justify-center overflow-y-auto bg-black/60 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl max-w-md w-full p-6 my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="auth-modal-title" className="text-lg font-semibold text-white">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Saves sync to the cloud when you are signed in. Stay signed out to keep progress only on this device.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-slate-400 mb-1">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              disabled={busy}
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-xs font-medium text-slate-400 mb-1">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              disabled={busy}
            />
          </div>
          {message && <p className="text-sm text-amber-400">{message}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
            setMessage(null);
          }}
          className="mt-4 w-full text-center text-sm text-slate-400 hover:text-teal-400 transition-colors"
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>,
    document.body
  );
}
