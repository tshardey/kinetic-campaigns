/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CAMPAIGN_ASSETS_BUCKET,
  OMIJA_STORAGE_PREFIX,
  campaignOmijaAssetUrl,
} from './campaign-asset-url';
import { SUPABASE_PLACEHOLDER_PUBLISHABLE_KEY } from './supabase-config';

describe('campaignOmijaAssetUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', undefined);
    vi.stubEnv('BASE_URL', '/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses public folder paths when Supabase is not configured', () => {
    expect(campaignOmijaAssetUrl('background/adventure-hero.png')).toBe(
      '/campaign/omija/background/adventure-hero.png'
    );
  });

  it('strips leading slashes on relative paths', () => {
    expect(campaignOmijaAssetUrl('/loot/loot-frame.png')).toBe('/campaign/omija/loot/loot-frame.png');
  });

  it('uses Storage public URL when Supabase is configured', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
    expect(campaignOmijaAssetUrl('scenes/shattered-guardian.png')).toBe(
      `https://abc.supabase.co/storage/v1/object/public/${CAMPAIGN_ASSETS_BUCKET}/${OMIJA_STORAGE_PREFIX}/scenes/shattered-guardian.png`
    );
  });

  it('is false-placeholder safe (same as supabase-config)', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', SUPABASE_PLACEHOLDER_PUBLISHABLE_KEY);
    expect(campaignOmijaAssetUrl('loot/loot-frame.png')).toBe('/campaign/omija/loot/loot-frame.png');
  });
});
