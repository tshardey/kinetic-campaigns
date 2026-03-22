/**
 * One-time migration: after a user signs in with Supabase configured, move any
 * existing `localStorage` saves into Supabase, then stop reading those keys for
 * hydration (tracked per user + campaign). Clears legacy keys once cloud is the
 * source of truth for that scope.
 */

import {
  loadGameStateLocal,
  clearOfflineLegacyPersistence,
  type PersistedGameState,
} from '@/lib/game-state-storage';
import { loadPersistedGameStateFromSupabase, persistGameStateToSupabase } from '@/lib/persist-game-state';

const MIGRATION_V1_KEY = 'kinetic-campaigns-legacy-migration-v1';

function scopeKey(userId: string, campaignId: string): string {
  return `${userId}:${campaignId}`;
}

function readMigratedScopes(): Set<string> {
  try {
    const raw = localStorage.getItem(MIGRATION_V1_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

/** Exposed for tests. */
export function isLegacyMigrationComplete(userId: string, campaignId: string): boolean {
  return readMigratedScopes().has(scopeKey(userId, campaignId));
}

function markLegacyMigrationComplete(userId: string, campaignId: string): void {
  const next = readMigratedScopes();
  next.add(scopeKey(userId, campaignId));
  localStorage.setItem(MIGRATION_V1_KEY, JSON.stringify([...next]));
}

/** Prevents parallel first-time migrations from racing (both read local, one clears — other returns null). */
const inflightFirstMigration = new Map<string, Promise<PersistedGameState | null>>();

async function runFirstTimeMigration(params: {
  userId: string;
  campaignId: string;
  cols: number;
  rows: number;
  startingHex?: { q: number; r: number };
}): Promise<PersistedGameState | null> {
  const { userId, campaignId, cols, rows, startingHex } = params;

  const loadRemote = () =>
    loadPersistedGameStateFromSupabase({ userId, campaignId, cols, rows, startingHex });

  const remote = await loadRemote();
  const local = loadGameStateLocal(cols, rows);

  if (remote) {
    markLegacyMigrationComplete(userId, campaignId);
    clearOfflineLegacyPersistence();
    return remote;
  }

  if (local?.character) {
    await persistGameStateToSupabase({ userId, campaignId, state: local });
    markLegacyMigrationComplete(userId, campaignId);
    clearOfflineLegacyPersistence();
    return local;
  }

  markLegacyMigrationComplete(userId, campaignId);
  clearOfflineLegacyPersistence();
  return null;
}

/**
 * Load persisted game state for a signed-in user. On first run per user+campaign,
 * may read `localStorage`, upsert into Supabase, mark migration complete, and clear
 * legacy keys. After that, only Supabase is used for hydration.
 */
export async function resolvePersistedGameStateForSignedInUser(params: {
  userId: string;
  campaignId: string;
  cols: number;
  rows: number;
  startingHex?: { q: number; r: number };
}): Promise<PersistedGameState | null> {
  const { userId, campaignId, cols, rows, startingHex } = params;

  if (isLegacyMigrationComplete(userId, campaignId)) {
    return loadPersistedGameStateFromSupabase({ userId, campaignId, cols, rows, startingHex });
  }

  const key = scopeKey(userId, campaignId);
  const existing = inflightFirstMigration.get(key);
  if (existing) return existing;

  const promise = runFirstTimeMigration({ userId, campaignId, cols, rows, startingHex }).finally(() => {
    inflightFirstMigration.delete(key);
  });
  inflightFirstMigration.set(key, promise);
  return promise;
}
