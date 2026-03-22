/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resolvePersistedGameStateForSignedInUser,
  isLegacyMigrationComplete,
} from './legacy-local-to-supabase-migration';
import * as persist from './persist-game-state';
import {
  saveGameStateLocal,
  loadGameStateLocal,
  getDefaultMapState,
  type PersistedGameState,
} from './game-state-storage';
import type { Character } from '@/types/character';

vi.mock('./persist-game-state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./persist-game-state')>();
  return {
    ...actual,
    loadPersistedGameStateFromSupabase: vi.fn(),
    persistGameStateToSupabase: vi.fn(),
  };
});

const COLS = 14;
const ROWS = 9;
const USER = 'user-1';
const CAMPAIGN = 'omija';

const validCharacter: Character = {
  name: 'Test',
  playbook: 'gate-crasher',
  startingMoveId: 'momentum-strike',
  stats: { brawn: 2, flow: 0, haste: 1, focus: -1 },
  resources: { slipstream: 5, strikes: 2, wards: 0, aether: 1 },
  progression: { xp: 0, level: 1, currency: 0 },
  hp: 5,
  maxHp: 5,
};

function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key() {
      return null;
    },
  };
}

describe('legacy-local-to-supabase-migration', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
    vi.mocked(persist.loadPersistedGameStateFromSupabase).mockReset();
    vi.mocked(persist.persistGameStateToSupabase).mockReset();
    vi.mocked(persist.persistGameStateToSupabase).mockResolvedValue(undefined);
  });

  const baseParams = {
    userId: USER,
    campaignId: CAMPAIGN,
    cols: COLS,
    rows: ROWS,
  };

  it('when remote has data, returns remote, marks migration, clears legacy keys', async () => {
    const mapState = getDefaultMapState(COLS, ROWS);
    const remote: PersistedGameState = {
      character: validCharacter,
      mapState,
    };
    vi.mocked(persist.loadPersistedGameStateFromSupabase).mockResolvedValue(remote);

    saveGameStateLocal(remote);
    mockStorage.setItem('kinetic-campaigns-character', JSON.stringify(validCharacter));

    const result = await resolvePersistedGameStateForSignedInUser(baseParams);

    expect(result).toEqual(remote);
    expect(isLegacyMigrationComplete(USER, CAMPAIGN)).toBe(true);
    expect(mockStorage.getItem('kinetic-campaigns-game-state')).toBeNull();
    expect(mockStorage.getItem('kinetic-campaigns-character')).toBeNull();
    expect(persist.persistGameStateToSupabase).not.toHaveBeenCalled();
  });

  it('when remote empty and local has save, upserts, marks migration, clears keys', async () => {
    vi.mocked(persist.loadPersistedGameStateFromSupabase).mockResolvedValue(null);

    const mapState = getDefaultMapState(COLS, ROWS);
    const local: PersistedGameState = { character: validCharacter, mapState };
    saveGameStateLocal(local);
    const normalized = loadGameStateLocal(COLS, ROWS);
    expect(normalized).not.toBeNull();

    const result = await resolvePersistedGameStateForSignedInUser(baseParams);

    expect(result).toEqual(normalized);
    expect(persist.persistGameStateToSupabase).toHaveBeenCalledWith({
      userId: USER,
      campaignId: CAMPAIGN,
      state: normalized,
    });
    expect(isLegacyMigrationComplete(USER, CAMPAIGN)).toBe(true);
    expect(mockStorage.getItem('kinetic-campaigns-game-state')).toBeNull();
  });

  it('when remote and local empty, marks migration, clears stale legacy keys, returns null', async () => {
    vi.mocked(persist.loadPersistedGameStateFromSupabase).mockResolvedValue(null);

    mockStorage.setItem('kinetic-campaigns-game-state', '{"invalid":true}');
    mockStorage.setItem('kinetic-campaigns-character', '{}');

    const result = await resolvePersistedGameStateForSignedInUser(baseParams);

    expect(result).toBeNull();
    expect(isLegacyMigrationComplete(USER, CAMPAIGN)).toBe(true);
    expect(mockStorage.getItem('kinetic-campaigns-game-state')).toBeNull();
    expect(mockStorage.getItem('kinetic-campaigns-character')).toBeNull();
    expect(persist.persistGameStateToSupabase).not.toHaveBeenCalled();
  });

  it('after migration, only calls loadPersistedGameStateFromSupabase', async () => {
    const mapState = getDefaultMapState(COLS, ROWS);
    const remote: PersistedGameState = { character: validCharacter, mapState };
    vi.mocked(persist.loadPersistedGameStateFromSupabase).mockResolvedValue(remote);

    await resolvePersistedGameStateForSignedInUser(baseParams);
    vi.mocked(persist.loadPersistedGameStateFromSupabase).mockClear();

    saveGameStateLocal({ character: validCharacter, mapState });

    const second = await resolvePersistedGameStateForSignedInUser(baseParams);

    expect(second).toEqual(remote);
    expect(vi.mocked(persist.loadPersistedGameStateFromSupabase)).toHaveBeenCalledTimes(1);
    expect(mockStorage.getItem('kinetic-campaigns-game-state')).not.toBeNull();
  });
});
