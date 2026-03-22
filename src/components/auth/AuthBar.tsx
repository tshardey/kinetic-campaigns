import { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SignInModal } from '@/components/auth/SignInModal';

interface AuthBarProps {
  className?: string;
}

/**
 * Supabase email/password entry and session status. Hidden when env is not configured (local-only saves).
 */
export function AuthBar({ className = '' }: AuthBarProps) {
  const { user, isSupabaseConfigured, signOut } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <span
        className={`text-xs text-slate-500 tabular-nums ${className}`}
        title="Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable cloud saves"
      >
        Local save
      </span>
    );
  }

  if (user) {
    const label = user.email ?? user.id;
    return (
      <div className={`flex items-center gap-2 min-w-0 ${className}`}>
        <span className="hidden sm:inline truncate max-w-[160px] text-xs text-slate-400" title={label}>
          {label}
        </span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700"
          title="Sign out (progress stays in this browser until you sign in again)"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-teal-300 hover:text-white hover:bg-slate-800 border border-teal-800/80 ${className}`}
      >
        <LogIn className="w-3.5 h-3.5 shrink-0" />
        Sign in
      </button>
      {modalOpen && <SignInModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
