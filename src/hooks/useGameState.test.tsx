/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from './useGameState';
import { saveGameState, getDefaultMapState } from '@/lib/game-state-storage';
import type { Character } from '@/types/character';
import type { CampaignPackage } from '@/types/campaign';
import { omijaCampaign } from '@/data/omija';
import { getDefaultStartHexId } from '@/engine/encounter-placement';

const COLS = 14;
const ROWS = 9;

const validCharacter: Character = {
  name: 'Test Hero',
  playbook: 'gate-crasher',
  startingMoveId: 'momentum-strike',
  stats: { brawn: 2, flow: 0, haste: 1, focus: -1 },
  resources: { slipstream: 5, strikes: 2, wards: 0, aether: 1 },
  progression: { xp: 0, level: 1, currency: 120 },
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

describe('useGameState', () => {
  let mockStorage: Storage;
  const campaign: CampaignPackage = omijaCampaign;

  beforeEach(() => {
    mockStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
  });

  it('returns null character and default resources when no save exists', () => {
    const { result } = renderHook(() =>
      useGameState({ cols: COLS, rows: ROWS, campaign })
    );

    expect(result.current.character).toBeNull();
    expect(result.current.resources.slipstream).toBe(5);
    expect(result.current.resources.strikes).toBe(2);
    expect(result.current.progression.currency).toBe(120);
    expect(result.current.inventory).toEqual([]);
  });

  it('initializes map state from default when no save exists', () => {
    const defaultMap = getDefaultMapState(COLS, ROWS);
    const { result } = renderHook(() =>
      useGameState({ cols: COLS, rows: ROWS, campaign })
    );

    expect(result.current.playerPos).toEqual(defaultMap.playerPos);
    expect(result.current.revealedHexes.has(defaultMap.revealedHexes[0])).toBe(true);
    expect(result.current.clearedHexes.size).toBe(0);
  });

  it('setCharacter sets character and initializes map state when going from null to character', () => {
    const { result } = renderHook(() =>
      useGameState({ cols: COLS, rows: ROWS, campaign })
    );

    expect(result.current.character).toBeNull();

    act(() => {
      result.current.setCharacter(validCharacter);
    });

    expect(result.current.character).not.toBeNull();
    expect(result.current.character!.name).toBe(validCharacter.name);
    expect(result.current.resources).toEqual(validCharacter.resources);
    const startHexId = getDefaultStartHexId(COLS, ROWS);
    expect(result.current.revealedHexes.has(startHexId)).toBe(true);
    expect(result.current.clearedHexes.size).toBe(0);
  });

  it('persists to localStorage when character and state change', () => {
    const { result } = renderHook(() =>
      useGameState({ cols: COLS, rows: ROWS, campaign })
    );

    act(() => {
      result.current.setCharacter(validCharacter);
    });

    const raw = mockStorage.getItem('kinetic-campaigns-game-state');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.character.name).toBe(validCharacter.name);
    expect(parsed.mapState.playerPos).toEqual(result.current.playerPos);
    expect(Array.isArray(parsed.mapState.revealedHexes)).toBe(true);
  });

  it('logWorkout updates resources', () => {
    const { result } = renderHook(() =>
      useGameState({ cols: COLS, rows: ROWS, campaign })
    );

    act(() => {
      result.current.setCharacter(validCharacter);
    });

    const slipstreamBefore = result.current.resources.slipstream;
    act(() => {
      result.current.logWorkout('cardio');
    });
    expect(result.current.resources.slipstream).toBe(slipstreamBefore + 1);

    const strikesBefore = result.current.resources.strikes;
    act(() => {
      result.current.logWorkout('strength');
    });
    expect(result.current.resources.strikes).toBe(strikesBefore + 1);
  });

  it('purchaseReward updates progression when affordable', () => {
    const { result } = renderHook(() =>
      useGameState({ cols: COLS, rows: ROWS, campaign })
    );

    act(() => {
      result.current.setCharacter({
        ...validCharacter,
        progression: { xp: 0, level: 1, currency: 200 },
      });
    });

    const reward = { id: 1, title: 'Test', cost: 50, icon: '🎁', desc: 'Test reward' };
    act(() => {
      result.current.purchaseReward(reward);
    });

    expect(result.current.progression.currency).toBe(150);
  });

  it('restores state from localStorage when saved game exists', () => {
    const mapState = getDefaultMapState(COLS, ROWS);
    mapState.clearedHexes.push('2,2');
    saveGameState({
      character: { ...validCharacter, progression: { xp: 1, level: 1, currency: 99 } },
      mapState,
    });

    const { result } = renderHook(() =>
      useGameState({ cols: COLS, rows: ROWS, campaign })
    );

    expect(result.current.character).not.toBeNull();
    expect(result.current.character!.name).toBe(validCharacter.name);
    expect(result.current.progression.currency).toBe(99);
    expect(result.current.clearedHexes.has('2,2')).toBe(true);
  });

  describe('engageEncounter (anomaly)', () => {
    // Whispering Shrine in omija uses wards + aether
    const anomalyEncounter = {
      type: 'anomaly' as const,
      name: 'The Whispering Shrine',
      cost: 2,
      resource: 'wards' as const,
      resource_amount: 1,
      gold: 30,
    };

    it('spends secondary resource and aether, then applies gold when resolving anomaly', () => {
      const characterWithResources = {
        ...validCharacter,
        resources: { slipstream: 5, strikes: 2, wards: 1, aether: 3 },
      };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );

      act(() => {
        result.current.setCharacter(characterWithResources);
      });

      const hexId = '3,4';
      act(() => {
        result.current.engageEncounter(hexId, anomalyEncounter);
      });

      expect(result.current.resources.aether).toBe(1);
      expect(result.current.resources.wards).toBe(0);
      expect(result.current.progression.currency).toBe(120 + 30);
      expect(result.current.clearedHexes.has(hexId)).toBe(true);
      expect(result.current.justClearedHexId).toBe(hexId);
    });

    it('does not clear hex or spend resources when player lacks secondary resource', () => {
      const characterNoWards = {
        ...validCharacter,
        resources: { slipstream: 5, strikes: 2, wards: 0, aether: 3 },
      };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );

      act(() => {
        result.current.setCharacter(characterNoWards);
      });

      const hexId = '1,1';
      const currencyBefore = result.current.progression.currency;
      const aetherBefore = result.current.resources.aether;

      act(() => {
        result.current.engageEncounter(hexId, anomalyEncounter);
      });

      expect(result.current.clearedHexes.has(hexId)).toBe(false);
      expect(result.current.progression.currency).toBe(currencyBefore);
      expect(result.current.resources.aether).toBe(aetherBefore);
      expect(result.current.resources.wards).toBe(0);
    });

    it('does not clear hex when player lacks aether', () => {
      const characterLowAether = {
        ...validCharacter,
        resources: { slipstream: 5, strikes: 2, wards: 1, aether: 1 },
      };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );

      act(() => {
        result.current.setCharacter(characterLowAether);
      });

      const hexId = '2,2';
      act(() => {
        result.current.engageEncounter(hexId, { ...anomalyEncounter, cost: 2 });
      });

      expect(result.current.clearedHexes.has(hexId)).toBe(false);
      expect(result.current.resources.aether).toBe(1);
      expect(result.current.resources.wards).toBe(1);
    });
  });
});
