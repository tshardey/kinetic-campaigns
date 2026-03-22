/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CAMPAIGN_ASSETS_BUCKET,
  OMIJA_STORAGE_PREFIX,
  campaignAssetsUsePublicFolder,
  campaignOmijaAssetUrl,
  normalizeCampaignContentUrl,
} from './campaign-asset-url';
import { SUPABASE_PLACEHOLDER_PUBLISHABLE_KEY } from './supabase-config';

describe('campaignOmijaAssetUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', undefined);
    vi.stubEnv('VITE_CAMPAIGN_ASSETS_USE_PUBLIC', undefined);
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

  it('uses Storage URLs when VITE_CAMPAIGN_ASSETS_USE_PUBLIC=false even without auth env', () => {
    vi.stubEnv('VITE_CAMPAIGN_ASSETS_USE_PUBLIC', 'false');
    expect(campaignOmijaAssetUrl('background/adventure-hero.png')).toBe(
      `http://127.0.0.1:54321/storage/v1/object/public/${CAMPAIGN_ASSETS_BUCKET}/${OMIJA_STORAGE_PREFIX}/background/adventure-hero.png`
    );
  });

  it('Storage-only mode still uses project URL when Supabase is configured', () => {
    vi.stubEnv('VITE_CAMPAIGN_ASSETS_USE_PUBLIC', 'false');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
    expect(campaignOmijaAssetUrl('scenes/x.png')).toBe(
      `https://abc.supabase.co/storage/v1/object/public/${CAMPAIGN_ASSETS_BUCKET}/${OMIJA_STORAGE_PREFIX}/scenes/x.png`
    );
  });
});

describe('normalizeCampaignContentUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://proj.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
    vi.stubEnv('VITE_CAMPAIGN_ASSETS_USE_PUBLIC', undefined);
    vi.stubEnv('BASE_URL', '/kinetic-campaigns/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns undefined for null/empty', () => {
    expect(normalizeCampaignContentUrl(null)).toBeUndefined();
    expect(normalizeCampaignContentUrl('')).toBeUndefined();
    expect(normalizeCampaignContentUrl('   ')).toBeUndefined();
  });

  it('passes through Supabase Storage URLs', () => {
    const u = `https://proj.supabase.co/storage/v1/object/public/${CAMPAIGN_ASSETS_BUCKET}/campaign/omija/loot/x.png`;
    expect(normalizeCampaignContentUrl(u)).toBe(u);
  });

  it('passes through unrelated absolute URLs', () => {
    expect(normalizeCampaignContentUrl('https://example.com/potion.png')).toBe('https://example.com/potion.png');
  });

  it('rewrites GitHub Pages app paths to Storage when Supabase is configured', () => {
    expect(
      normalizeCampaignContentUrl(
        'https://user.github.io/kinetic-campaigns/campaign/omija/loot/memory-censer.png'
      )
    ).toBe(
      `https://proj.supabase.co/storage/v1/object/public/${CAMPAIGN_ASSETS_BUCKET}/${OMIJA_STORAGE_PREFIX}/loot/memory-censer.png`
    );
  });

  it('rewrites path-only omija assets', () => {
    expect(normalizeCampaignContentUrl('campaign/omija/loot/loot-frame.png')).toBe(
      `https://proj.supabase.co/storage/v1/object/public/${CAMPAIGN_ASSETS_BUCKET}/${OMIJA_STORAGE_PREFIX}/loot/loot-frame.png`
    );
  });
});

describe('campaignAssetsUsePublicFolder', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CAMPAIGN_ASSETS_USE_PUBLIC', undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is true by default', () => {
    expect(campaignAssetsUsePublicFolder()).toBe(true);
  });

  it('is false when env is the string false', () => {
    vi.stubEnv('VITE_CAMPAIGN_ASSETS_USE_PUBLIC', 'false');
    expect(campaignAssetsUsePublicFolder()).toBe(false);
  });
});
