/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadPersistedGameStateFromSupabase,
  persistGameStateToSupabase,
} from './persist-game-state';
import type { PersistedGameState } from './game-state-storage';
import { getDefaultMapState } from './game-state-storage';
import type { Character } from '@/types/character';

const USER_ID = 'user-1';
const CAMPAIGN_ID = 'omija';
const COLS = 14;
const ROWS = 9;

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

const mocks = vi.hoisted(() => ({
  maybeSingleChar: vi.fn(),
  maybeSingleGs: vi.fn(),
  upsertChar: vi.fn(),
  upsertGs: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: (table: string) => {
      if (table === 'characters') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: mocks.maybeSingleChar,
              }),
            }),
          }),
          upsert: mocks.upsertChar,
        };
      }
      if (table === 'game_states') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: mocks.maybeSingleGs,
              }),
            }),
          }),
          upsert: mocks.upsertGs,
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  },
}));

describe('persist-game-state', () => {
  beforeEach(() => {
    mocks.maybeSingleChar.mockReset();
    mocks.maybeSingleGs.mockReset();
    mocks.upsertChar.mockReset();
    mocks.upsertGs.mockReset();
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.upsertChar.mockResolvedValue({ error: null });
    mocks.upsertGs.mockResolvedValue({ error: null });
  });

  it('loadPersistedGameStateFromSupabase returns null when character row is missing', async () => {
    mocks.maybeSingleChar.mockResolvedValue({ data: null, error: null });
    await expect(
      loadPersistedGameStateFromSupabase({
        userId: USER_ID,
        campaignId: CAMPAIGN_ID,
        cols: COLS,
        rows: ROWS,
      })
    ).resolves.toBeNull();
  });

  it('loadPersistedGameStateFromSupabase returns null when character payload is invalid', async () => {
    mocks.maybeSingleChar.mockResolvedValue({
      data: { payload: { name: '' } },
      error: null,
    });
    await expect(
      loadPersistedGameStateFromSupabase({
        userId: USER_ID,
        campaignId: CAMPAIGN_ID,
        cols: COLS,
        rows: ROWS,
      })
    ).resolves.toBeNull();
  });

  it('loadPersistedGameStateFromSupabase merges characters + game_states', async () => {
    const mapState = getDefaultMapState(COLS, ROWS);
    mapState.clearedHexes.push('1,1');
    mocks.maybeSingleChar.mockResolvedValue({
      data: { payload: validCharacter },
      error: null,
    });
    mocks.maybeSingleGs.mockResolvedValue({
      data: {
        map_state: mapState,
        pending_level_up: true,
        pending_progression_after_level_up: { xp: 1, level: 2, currency: 0 },
      },
      error: null,
    });
    const loaded = await loadPersistedGameStateFromSupabase({
      userId: USER_ID,
      campaignId: CAMPAIGN_ID,
      cols: COLS,
      rows: ROWS,
    });
    expect(loaded).not.toBeNull();
    expect(loaded!.character.name).toBe(validCharacter.name);
    expect(loaded!.mapState.clearedHexes).toContain('1,1');
    expect(loaded!.pendingLevelUp).toBe(true);
    expect(loaded!.pendingProgressionAfterLevelUp).toEqual({
      xp: 1,
      level: 2,
      currency: 0,
    });
  });

  it('persistGameStateToSupabase upserts characters and game_states', async () => {
    const state: PersistedGameState = {
      character: validCharacter,
      mapState: getDefaultMapState(COLS, ROWS),
    };
    await persistGameStateToSupabase({
      userId: USER_ID,
      campaignId: CAMPAIGN_ID,
      state,
    });

    expect(mocks.rpc).toHaveBeenCalledWith('ensure_omija_campaign_row');
    expect(mocks.upsertChar).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        campaign_id: CAMPAIGN_ID,
        payload: expect.objectContaining({ name: validCharacter.name }),
      }),
      { onConflict: 'user_id,campaign_id' }
    );
    expect(mocks.upsertGs).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        campaign_id: CAMPAIGN_ID,
        map_state: state.mapState,
      }),
      { onConflict: 'user_id,campaign_id' }
    );
  });

  it('persistGameStateToSupabase skips upserts and writes local snapshot when ensure RPC fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'function not found' } });
    const state: PersistedGameState = {
      character: validCharacter,
      mapState: getDefaultMapState(COLS, ROWS),
    };
    const store: Record<string, string> = {};
    const mockStorage: Storage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
      get length() {
        return Object.keys(store).length;
      },
      key: () => null,
    };
    vi.stubGlobal('localStorage', mockStorage);

    await persistGameStateToSupabase({
      userId: USER_ID,
      campaignId: CAMPAIGN_ID,
      state,
    });

    expect(mocks.upsertChar).not.toHaveBeenCalled();
    expect(mocks.upsertGs).not.toHaveBeenCalled();
    const raw = mockStorage.getItem('kinetic-campaigns-game-state');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toMatchObject({ character: { name: validCharacter.name } });
  });

  it('round-trips currentStreak and lastActiveTimestamp through Supabase persistence', async () => {
    const character: Character = {
      ...validCharacter,
      currentStreak: 5,
      lastActiveTimestamp: '2026-05-11T07:00:00-07:00',
    };
    const state: PersistedGameState = {
      character,
      mapState: getDefaultMapState(COLS, ROWS),
    };
    await persistGameStateToSupabase({
      userId: USER_ID,
      campaignId: CAMPAIGN_ID,
      state,
    });
    expect(mocks.upsertChar).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          currentStreak: 5,
          lastActiveTimestamp: '2026-05-11T07:00:00-07:00',
        }),
      }),
      { onConflict: 'user_id,campaign_id' }
    );

    mocks.maybeSingleChar.mockResolvedValue({
      data: { payload: character },
      error: null,
    });
    mocks.maybeSingleGs.mockResolvedValue({ data: null, error: null });
    const loaded = await loadPersistedGameStateFromSupabase({
      userId: USER_ID,
      campaignId: CAMPAIGN_ID,
      cols: COLS,
      rows: ROWS,
    });
    expect(loaded!.character.currentStreak).toBe(5);
    expect(loaded!.character.lastActiveTimestamp).toBe('2026-05-11T07:00:00-07:00');
  });

  it('loadPersistedGameStateFromSupabase backfills currentStreak when missing on legacy payload', async () => {
    const { currentStreak: _omit, lastActiveTimestamp: _omit2, ...legacy } = {
      ...validCharacter,
      currentStreak: undefined,
      lastActiveTimestamp: undefined,
    };
    void _omit;
    void _omit2;
    mocks.maybeSingleChar.mockResolvedValue({
      data: { payload: legacy },
      error: null,
    });
    mocks.maybeSingleGs.mockResolvedValue({ data: null, error: null });
    const loaded = await loadPersistedGameStateFromSupabase({
      userId: USER_ID,
      campaignId: CAMPAIGN_ID,
      cols: COLS,
      rows: ROWS,
    });
    expect(loaded!.character.currentStreak).toBe(0);
    expect(loaded!.character.lastActiveTimestamp).toBeUndefined();
  });

  it('persistGameStateToSupabase does not call ensure RPC for non-omija campaign', async () => {
    const state: PersistedGameState = {
      character: validCharacter,
      mapState: getDefaultMapState(COLS, ROWS),
    };
    await persistGameStateToSupabase({
      userId: USER_ID,
      campaignId: 'other-realm',
      state,
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.upsertChar).toHaveBeenCalledWith(
      expect.objectContaining({ campaign_id: 'other-realm' }),
      { onConflict: 'user_id,campaign_id' }
    );
  });

  it('persistGameStateToSupabase writes local snapshot when character upsert fails', async () => {
    const state: PersistedGameState = {
      character: validCharacter,
      mapState: getDefaultMapState(COLS, ROWS),
    };
    mocks.upsertChar.mockResolvedValue({ error: { message: 'fail' } });

    const store: Record<string, string> = {};
    const mockStorage: Storage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
      get length() {
        return Object.keys(store).length;
      },
      key: () => null,
    };
    vi.stubGlobal('localStorage', mockStorage);

    await persistGameStateToSupabase({
      userId: USER_ID,
      campaignId: CAMPAIGN_ID,
      state,
    });

    expect(mocks.rpc).toHaveBeenCalledWith('ensure_omija_campaign_row');
    expect(mocks.upsertGs).not.toHaveBeenCalled();
    const raw = mockStorage.getItem('kinetic-campaigns-game-state');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toMatchObject({ character: { name: validCharacter.name } });
  });
});
