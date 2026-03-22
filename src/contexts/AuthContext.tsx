import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured as readSupabaseConfiguredFromEnv } from '@/lib/supabase-config';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** True after initial session resolution (or immediately if Supabase env is missing). */
  isSessionReady: boolean;
  /** Whether VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set. */
  isSupabaseConfigured: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
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

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!configured) {
        return {
          error: { message: 'Supabase is not configured', name: 'AuthError', status: 0 } as AuthError,
        };
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return { error };
    },
    [configured]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!configured) {
        return {
          error: { message: 'Supabase is not configured', name: 'AuthError', status: 0 } as AuthError,
        };
      }
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      return { error };
    },
    [configured]
  );

  const signOut = useCallback(async () => {
    if (!configured) {
      return { error: { message: 'Supabase is not configured', name: 'AuthError', status: 0 } as AuthError };
    }
    const { error } = await supabase.auth.signOut();
    return { error };
  }, [configured]);

  const value = useMemo(
    (): AuthContextValue => ({
      session,
      user: session?.user ?? null,
      isSessionReady,
      isSupabaseConfigured: configured,
      signInWithPassword,
      signUp,
      signOut,
    }),
    [session, isSessionReady, configured, signInWithPassword, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
