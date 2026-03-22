/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isSupabaseConfigured, SUPABASE_PLACEHOLDER_PUBLISHABLE_KEY } from './supabase-config';

describe('isSupabaseConfigured', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is false when URL is missing', () => {
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'real-key');
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('is false when publishable key is missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('is false when key is the createClient placeholder', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', SUPABASE_PLACEHOLDER_PUBLISHABLE_KEY);
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('is true when both URL and a non-placeholder key are set', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
    expect(isSupabaseConfigured()).toBe(true);
  });
});
