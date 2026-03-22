import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured as readSupabaseConfiguredFromEnv } from '@/lib/supabase-config';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** True after initial session resolution (or immediately if Supabase env is missing). */
  isSessionReady: boolean;
  /** Whether VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set. */
  isSupabaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const configured = useMemo(() => readSupabaseConfiguredFromEnv(), []);

  useEffect(() => {
    if (!configured) {
      setSession(null);
      setIsSessionReady(true);
      return;
    }

    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session: next }, error }) => {
      if (cancelled) return;
      if (error) {
        console.error('[auth] getSession failed:', error.message);
        setSession(null);
      } else {
        setSession(next);
      }
      setIsSessionReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!cancelled) setSession(next);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [configured]);

  const value = useMemo(
    (): AuthContextValue => ({
      session,
      user: session?.user ?? null,
      isSessionReady,
      isSupabaseConfigured: configured,
    }),
    [session, isSessionReady, configured]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
