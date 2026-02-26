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
    // validCharacter has momentum-strike: base +1 Strike + intercept +1 = +2
    expect(result.current.resources.strikes).toBe(strikesBefore + 2);
  });

  it('logWorkout with durationMinutes grants scaled units', () => {
    const { result } = renderHook(() =>
      useGameState({ cols: COLS, rows: ROWS, campaign })
    );

    act(() => {
      result.current.setCharacter(validCharacter);
    });

    const slipstreamBefore = result.current.resources.slipstream;
    act(() => {
      result.current.logWorkout('cardio', 40); // 40 min = 2 slipstream
    });
    expect(result.current.resources.slipstream).toBe(slipstreamBefore + 2);
  });

  it('when toast is provided, movePlayer uses it instead of alert when cannot afford move', () => {
    const toast = vi.fn();
    const { result } = renderHook(() =>
      useGameState({ cols: COLS, rows: ROWS, campaign, toast })
    );

    act(() => {
      result.current.setCharacter({
        ...validCharacter,
        resources: { ...validCharacter.resources, slipstream: 0 },
      });
    });

    const [q, r] = result.current.playerPos.q + 1 <= COLS - 1
      ? [result.current.playerPos.q + 1, result.current.playerPos.r]
      : [result.current.playerPos.q - 1, result.current.playerPos.r];
    const id = `${q},${r}`;

    act(() => {
      result.current.movePlayer(q, r, id);
    });

    expect(toast).toHaveBeenCalledWith('Not enough Slipstream Tokens! Log some Cardio.', 'error');
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

  describe('attemptRiftStage', () => {
    it('spends resource cost and advances rift progress when affordable', () => {
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );

      act(() => {
        result.current.setCharacter(validCharacter);
      });

      const hexId = '3,4';
      const riftId = 'moon-cats-vigil';
      expect(result.current.resources.strikes).toBe(2);
      expect(result.current.riftProgress[riftId]).toBeUndefined();

      act(() => {
        result.current.attemptRiftStage(hexId, riftId, 0);
      });

      expect(result.current.resources.strikes).toBe(0);
      expect(result.current.riftProgress[riftId]).toBe(1);
    });

    it('returns false and does not advance when cannot afford', () => {
      const charNoStrikes = {
        ...validCharacter,
        resources: { ...validCharacter.resources, strikes: 0 },
      };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );

      act(() => {
        result.current.setCharacter(charNoStrikes);
      });

      const hexId = '3,4';
      const riftId = 'moon-cats-vigil';
      let attemptResult: boolean = false;
      act(() => {
        attemptResult = result.current.attemptRiftStage(hexId, riftId, 0);
      });

      expect(attemptResult).toBe(false);
      expect(result.current.riftProgress[riftId]).toBeUndefined();
      expect(result.current.resources.strikes).toBe(0);
    });

    it('on full rift completion adds completion loot and applies artifact Focus buff', () => {
      const charWithWards = {
        ...validCharacter,
        resources: { slipstream: 5, strikes: 3, wards: 1, aether: 1 },
        stats: { ...validCharacter.stats, focus: 0 },
      };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );

      act(() => {
        result.current.setCharacter(charWithWards);
      });

      const hexId = '3,4';
      const riftId = 'moon-cats-vigil';
      const initialFocus = result.current.character!.stats.focus;

      act(() => {
        result.current.attemptRiftStage(hexId, riftId, 0);
      });
      act(() => {
        result.current.attemptRiftStage(hexId, riftId, 1);
      });
      act(() => {
        result.current.attemptRiftStage(hexId, riftId, 2);
      });

      expect(result.current.riftProgress[riftId]).toBe(3);
      const moonCat = result.current.inventory.find((i) => i.id === 'moon-cat-coin');
      expect(moonCat).toBeDefined();
      expect(moonCat!.kind).toBe('artifact');
      expect(result.current.character!.stats.focus).toBe(initialFocus + 1);
    });
  });

  describe('level-up flow', () => {
    it('sets pendingLevelUp and holds progression at cap when encounter XP would level', () => {
      const eliteEncounter = {
        type: 'elite' as const,
        id: 'sovereigns-vanguard',
        name: "The Sovereign's Vanguard",
        strikes: 3,
        gold: 50,
      };
      const characterAtCap = {
        ...validCharacter,
        progression: { xp: 9, level: 1, currency: 120 },
        resources: { slipstream: 5, strikes: 3, wards: 0, aether: 1 },
      };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );

      act(() => {
        result.current.setCharacter(characterAtCap);
      });

      const hexId = '2,2';
      act(() => {
        result.current.engageEncounter(hexId, eliteEncounter);
      });

      expect(result.current.pendingLevelUp).toBe(true);
      expect(result.current.progression.xp).toBe(10); // held at cap
      expect(result.current.progression.level).toBe(1);
      expect(result.current.pendingProgressionAfterLevelUp).not.toBeNull();
      expect(result.current.pendingProgressionAfterLevelUp!.level).toBe(2);
      expect(result.current.pendingProgressionAfterLevelUp!.xp).toBe(0);
      expect(result.current.pendingProgressionAfterLevelUp!.currency).toBe(170);
    });

    it('completeLevelUp applies stat choice and clears pending', () => {
      const eliteEncounter = {
        type: 'elite' as const,
        id: 'sovereigns-vanguard',
        name: "The Sovereign's Vanguard",
        strikes: 3,
        gold: 50,
      };
      const characterAtCap = {
        ...validCharacter,
        progression: { xp: 9, level: 1, currency: 120 },
        resources: { slipstream: 5, strikes: 3, wards: 0, aether: 1 },
      };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );

      act(() => {
        result.current.setCharacter(characterAtCap);
      });

      act(() => {
        result.current.engageEncounter('2,2', eliteEncounter);
      });

      const focusBefore = result.current.character!.stats.focus;
      act(() => {
        result.current.completeLevelUp({ type: 'stat', stat: 'focus' });
      });

      expect(result.current.pendingLevelUp).toBe(false);
      expect(result.current.pendingProgressionAfterLevelUp).toBeNull();
      expect(result.current.progression.level).toBe(2);
      expect(result.current.progression.xp).toBe(0);
      expect(result.current.character!.stats.focus).toBe(focusBefore + 1);
    });

    it('completeLevelUp with new_move adds move to learnedMoveIds', () => {
      const characterAtCap = {
        ...validCharacter,
        progression: { xp: 9, level: 1, currency: 120 },
        resources: { slipstream: 5, strikes: 3, wards: 0, aether: 1 },
      };
      saveGameState({
        character: characterAtCap,
        mapState: getDefaultMapState(COLS, ROWS),
        pendingLevelUp: true,
        pendingProgressionAfterLevelUp: { xp: 0, level: 2, currency: 120 },
      });

      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );

      expect(result.current.pendingLevelUp).toBe(true);
      act(() => {
        result.current.completeLevelUp({ type: 'new_move', moveId: 'aura-of-conquest' });
      });

      expect(result.current.character!.learnedMoveIds).toContain('aura-of-conquest');
      expect(result.current.pendingLevelUp).toBe(false);
      expect(result.current.progression.level).toBe(2);
    });
  });
});
