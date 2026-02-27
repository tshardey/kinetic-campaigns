/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from './useGameState';
import { saveGameState, getDefaultMapState } from '@/lib/game-state-storage';
import type { Character } from '@/types/character';
import type { CampaignPackage, MapEncounter } from '@/types/campaign';
import { omijaCampaign } from '@/data/omija';
import { getDefaultStartHexId } from '@/engine/encounter-placement';
import { getHexIdsAtDistance } from '@/engine/hex-math';

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
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    const defaultMap = getDefaultMapState(COLS, ROWS, campaign.realm.startingHex);
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
    const startHexId = campaign.realm.startingHex
      ? `${campaign.realm.startingHex.q},${campaign.realm.startingHex.r}`
      : getDefaultStartHexId(COLS, ROWS);
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

  describe('engageEncounter (combat)', () => {
    const basicEncounter = { type: 'basic' as const, name: 'Scout', strikes: 1, gold: 10 };

    it('requires 1 Strike to attack and notifies when lacking', () => {
      const noStrikes = { ...validCharacter, resources: { ...validCharacter.resources, strikes: 0 } };
      const toast = vi.fn();
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, toast })
      );
      act(() => result.current.setCharacter(noStrikes));
      act(() => result.current.engageEncounter('2,2', basicEncounter));
      expect(toast).toHaveBeenCalledWith('Need 1 Strike to attack. Log more Strength!', 'error');
      expect(result.current.clearedHexes.has('2,2')).toBe(false);
      expect(result.current.resources.strikes).toBe(0);
    });

    it('one attack defeats 1-strike enemy and clears hex', () => {
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );
      act(() => result.current.setCharacter(validCharacter));
      act(() => result.current.engageEncounter('2,2', basicEncounter));
      expect(result.current.clearedHexes.has('2,2')).toBe(true);
      expect(result.current.progression.currency).toBe(120 + 10);
      expect(result.current.resources.strikes).toBe(1);
      expect(result.current.encounterHealth['2,2']).toBeUndefined();
    });

    it('retaliation can be blocked by spending 1 Aether when no Wards', () => {
      const noWardsWithAether = {
        ...validCharacter,
        hp: 3,
        resources: { slipstream: 5, strikes: 1, wards: 0, aether: 2 },
      };
      const twoStrikeEncounter = { type: 'basic' as const, name: 'Tough', strikes: 2, gold: 10 };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );
      act(() => result.current.setCharacter(noWardsWithAether));
      act(() => result.current.setPlayerPos({ q: 0, r: 2 }));

      act(() => result.current.engageEncounter('0,2', twoStrikeEncounter));

      expect(result.current.character!.hp).toBe(3);
      expect(result.current.resources.aether).toBe(1);
      expect(result.current.encounterHealth['0,2']).toBe(1);
    });

    it('heal spends 1 Aether for 1 HP and returns true', () => {
      const wounded = { ...validCharacter, hp: 3, maxHp: 5, resources: { ...validCharacter.resources, aether: 2 } };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );
      act(() => result.current.setCharacter(wounded));
      let ok = false;
      act(() => {
        ok = result.current.heal(1);
      });
      expect(ok).toBe(true);
      expect(result.current.character!.hp).toBe(4);
      expect(result.current.resources.aether).toBe(1);
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
      act(() => {
        result.current.engageEncounter(hexId, eliteEncounter);
      });
      act(() => {
        result.current.engageEncounter(hexId, eliteEncounter);
      });

      expect(result.current.pendingLevelUp).toBe(true);
      expect(result.current.progression.xp).toBe(10); // held at cap
      expect(result.current.progression.level).toBe(1);
      expect(result.current.pendingProgressionAfterLevelUp).not.toBeNull();
      expect(result.current.pendingProgressionAfterLevelUp!.level).toBe(2);
      expect(result.current.pendingProgressionAfterLevelUp!.xp).toBe(1); // 9 + 2 (elite XP) = 11, cap 10 → overflow 1
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
      act(() => {
        result.current.engageEncounter('2,2', eliteEncounter);
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
      expect(result.current.progression.xp).toBe(1); // overflow from 9 + 2 (elite XP)
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

    it('completeLevelUp restores HP to maxHp', () => {
      const woundedAtCap = {
        ...validCharacter,
        hp: 2,
        maxHp: 5,
        progression: { xp: 10, level: 1, currency: 120 },
        resources: { slipstream: 5, strikes: 3, wards: 0, aether: 1 },
      };
      saveGameState({
        character: woundedAtCap,
        mapState: getDefaultMapState(COLS, ROWS),
        pendingLevelUp: true,
        pendingProgressionAfterLevelUp: { xp: 0, level: 2, currency: 120 },
      });
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );
      expect(result.current.character!.hp).toBe(2);
      act(() => result.current.completeLevelUp({ type: 'stat', stat: 'focus' }));
      expect(result.current.character!.hp).toBe(5);
    });
  });

  describe('boss gate and campaign victory', () => {
    const bossEncounter = {
      type: 'boss' as const,
      id: 'obsidian-tempest',
      name: 'The Obsidian Tempest',
      strikes: 5,
      gold: 200,
    };
    const eliteEncounter = {
      type: 'elite' as const,
      id: 'sovereigns-vanguard',
      name: "The Sovereign's Vanguard",
      strikes: 3,
      gold: 50,
    };

    it('campaignStatus defaults to active when no save exists', () => {
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );
      act(() => result.current.setCharacter(validCharacter));
      expect(result.current.campaignStatus).toBe('active');
    });

    it('blocks boss attack when not all elites defeated and notifies', () => {
      const placedEncounters: Record<string, MapEncounter> = {
        '1,1': { ...eliteEncounter },
        '2,2': { ...eliteEncounter, id: 'master-of-the-crag', name: 'Master of the Crag' },
        '3,3': bossEncounter,
      };
      const toast = vi.fn();
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, placedEncounters, toast })
      );
      act(() => result.current.setCharacter(validCharacter));
      act(() => result.current.setClearedHexes(new Set(['1,1']))); // only one elite cleared
      act(() => result.current.setRiftProgress({ 'moon-cats-vigil': 3 })); // rift closed

      act(() =>
        result.current.engageEncounter('3,3', bossEncounter)
      );

      expect(toast).toHaveBeenCalledWith(
        'You must defeat all Elite encounters and fully close the Narrative Rift before facing the Realm Boss.',
        'error'
      );
      expect(result.current.clearedHexes.has('3,3')).toBe(false);
      expect(result.current.resources.strikes).toBe(2);
    });

    it('blocks boss attack when rift is not fully closed and notifies', () => {
      const placedEncounters: Record<string, MapEncounter> = {
        '1,1': { ...eliteEncounter },
        '2,2': { ...eliteEncounter, id: 'master-of-the-crag', name: 'Master of the Crag' },
        '3,3': bossEncounter,
      };
      const toast = vi.fn();
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, placedEncounters, toast })
      );
      act(() => result.current.setCharacter(validCharacter));
      act(() => result.current.setClearedHexes(new Set(['1,1', '2,2']))); // all elites cleared
      act(() => result.current.setRiftProgress({ 'moon-cats-vigil': 1 })); // rift not closed

      act(() =>
        result.current.engageEncounter('3,3', bossEncounter)
      );

      expect(toast).toHaveBeenCalledWith(
        'You must defeat all Elite encounters and fully close the Narrative Rift before facing the Realm Boss.',
        'error'
      );
      expect(result.current.clearedHexes.has('3,3')).toBe(false);
    });

    it('allows boss attack when all elites defeated and rift closed, and sets campaignStatus to victory on boss defeat', () => {
      const placedEncounters: Record<string, MapEncounter> = {
        '1,1': { ...eliteEncounter },
        '2,2': { ...eliteEncounter, id: 'master-of-the-crag', name: 'Master of the Crag' },
        '3,3': { ...eliteEncounter, id: 'echo-forgotten-shogun', name: 'Echo of the Forgotten Shogun' },
        '4,4': bossEncounter,
      };
      const charWithStrikes = {
        ...validCharacter,
        resources: { slipstream: 5, strikes: 5, wards: 0, aether: 1 },
      };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, placedEncounters })
      );
      act(() => result.current.setCharacter(charWithStrikes));
      act(() => result.current.setClearedHexes(new Set(['1,1', '2,2', '3,3'])));
      act(() => result.current.setRiftProgress({ 'moon-cats-vigil': 3 }));

      expect(result.current.campaignStatus).toBe('active');

      for (let i = 0; i < 5; i++) {
        act(() => result.current.engageEncounter('4,4', bossEncounter));
      }

      expect(result.current.clearedHexes.has('4,4')).toBe(true);
      expect(result.current.campaignStatus).toBe('victory');
      expect(result.current.progression.currency).toBe(120 + 200);
    });
  });

  describe('playbook moves: useDimensionalAnchor', () => {
    const riftWeaverWithAether: Character = {
      ...validCharacter,
      playbook: 'rift-weaver',
      startingMoveId: 'dimensional-anchor',
      resources: { slipstream: 5, strikes: 2, wards: 0, aether: 3 },
    };
    const eliteEncounter = {
      type: 'elite' as const,
      id: 'sovereigns-vanguard',
      name: "The Sovereign's Vanguard",
      strikes: 2,
      gold: 50,
    };

    it('spends 2 Aether and reduces Elite encounter health by 1', () => {
      const placedEncounters: Record<string, MapEncounter> = { '2,2': eliteEncounter };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, placedEncounters })
      );
      act(() => result.current.setCharacter(riftWeaverWithAether));
      act(() => result.current.setPlayerPos({ q: 2, r: 2 }));

      expect(result.current.encounterHealth['2,2']).toBeUndefined();
      expect(result.current.resources.aether).toBe(3);

      let ok = false;
      act(() => {
        ok = result.current.useDimensionalAnchor('2,2');
      });

      expect(ok).toBe(true);
      expect(result.current.resources.aether).toBe(1);
      expect(result.current.anchorUses['2,2']).toBe(true);
      expect(result.current.encounterHealth['2,2']).toBe(1);
    });

    it('returns false and notifies when not Rift-Weaver with Dimensional Anchor', () => {
      const toast = vi.fn();
      const placedEncounters: Record<string, MapEncounter> = { '2,2': eliteEncounter };
      const gateCrasherWithAether = { ...validCharacter, resources: { ...validCharacter.resources, aether: 3 } };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, placedEncounters, toast })
      );
      act(() => result.current.setCharacter(gateCrasherWithAether));
      act(() => result.current.setPlayerPos({ q: 2, r: 2 }));

      let ok = true;
      act(() => {
        ok = result.current.useDimensionalAnchor('2,2');
      });

      expect(ok).toBe(false);
      expect(toast).toHaveBeenCalledWith('Dimensional Anchor is a Rift-Weaver move.', 'error');
      expect(result.current.resources.aether).toBe(3);
    });

    it('returns false when insufficient Aether', () => {
      const toast = vi.fn();
      const lowAether = { ...riftWeaverWithAether, resources: { ...riftWeaverWithAether.resources, aether: 1 } };
      const placedEncounters: Record<string, MapEncounter> = { '2,2': eliteEncounter };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, placedEncounters, toast })
      );
      act(() => result.current.setCharacter(lowAether));
      act(() => result.current.setPlayerPos({ q: 2, r: 2 }));

      let ok = true;
      act(() => {
        ok = result.current.useDimensionalAnchor('2,2');
      });

      expect(ok).toBe(false);
      expect(toast).toHaveBeenCalledWith('Need 2 Aether for Dimensional Anchor.', 'error');
      expect(result.current.resources.aether).toBe(1);
    });

    it('returns false when used already on this encounter', () => {
      const toast = vi.fn();
      const placedEncounters: Record<string, MapEncounter> = { '2,2': eliteEncounter };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, placedEncounters, toast })
      );
      act(() => result.current.setCharacter(riftWeaverWithAether));
      act(() => result.current.setPlayerPos({ q: 2, r: 2 }));

      act(() => {
        result.current.useDimensionalAnchor('2,2');
      });
      expect(result.current.anchorUses['2,2']).toBe(true);

      let ok = true;
      act(() => {
        ok = result.current.useDimensionalAnchor('2,2');
      });

      expect(ok).toBe(false);
      expect(toast).toHaveBeenCalledWith('You have already used Dimensional Anchor on this encounter.', 'error');
    });
  });

  describe('playbook moves: Phase Strike', () => {
    const wayfinder: Character = {
      ...validCharacter,
      playbook: 'wayfinder',
      startingMoveId: 'phase-strike',
      resources: { slipstream: 5, strikes: 0, wards: 0, aether: 1 },
    };
    const basicEncounter = { type: 'basic' as const, name: 'Scout', strikes: 1, gold: 10 };

    it('spends 3 Slipstream, deals 1 damage, no retaliation, and clears hex when enemy dies', () => {
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );
      act(() => result.current.setCharacter(wayfinder));
      act(() => result.current.setPlayerPos({ q: 0, r: 3 }));

      act(() => {
        result.current.engageEncounter('0,3', basicEncounter, { phaseStrike: true });
      });

      expect(result.current.resources.slipstream).toBe(2);
      expect(result.current.resources.strikes).toBe(0);
      expect(result.current.clearedHexes.has('0,3')).toBe(true);
      expect(result.current.character!.hp).toBe(5);
    });

    it('notifies when not Wayfinder with Phase Strike', () => {
      const toast = vi.fn();
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, toast })
      );
      act(() => result.current.setCharacter(validCharacter));
      act(() => result.current.setPlayerPos({ q: 0, r: 3 }));

      act(() => {
        result.current.engageEncounter('0,3', basicEncounter, { phaseStrike: true });
      });

      expect(toast).toHaveBeenCalledWith('Phase Strike is a Wayfinder move.', 'error');
      expect(result.current.clearedHexes.has('0,3')).toBe(false);
    });

    it('notifies when insufficient Slipstream', () => {
      const toast = vi.fn();
      const lowSlip = { ...wayfinder, resources: { ...wayfinder.resources, slipstream: 2 } };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, toast })
      );
      act(() => result.current.setCharacter(lowSlip));
      act(() => result.current.setPlayerPos({ q: 0, r: 3 }));

      act(() => {
        result.current.engageEncounter('0,3', basicEncounter, { phaseStrike: true });
      });

      expect(toast).toHaveBeenCalledWith('Need 3 Slipstream for Phase Strike. Log more Cardio!', 'error');
      expect(result.current.resources.slipstream).toBe(2);
    });
  });

  describe('playbook moves: Aura of Conquest', () => {
    it('grants +1 Ward on victory when Gate-Crasher with Aura of Conquest', () => {
      const gateCrasherAura: Character = {
        ...validCharacter,
        playbook: 'gate-crasher',
        startingMoveId: 'aura-of-conquest',
        resources: { slipstream: 5, strikes: 2, wards: 0, aether: 1 },
      };
      const basicEncounter = { type: 'basic' as const, name: 'Scout', strikes: 1, gold: 10 };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );
      act(() => result.current.setCharacter(gateCrasherAura));
      act(() => result.current.setPlayerPos({ q: 1, r: 2 }));

      expect(result.current.resources.wards).toBe(0);
      act(() => result.current.engageEncounter('1,2', basicEncounter));
      expect(result.current.clearedHexes.has('1,2')).toBe(true);
      expect(result.current.resources.wards).toBe(1);
    });
  });

  describe('playbook moves: Defy Reality', () => {
    it('sacrifices 1 item, restores full HP, and bypasses knockback when would hit 0 HP', () => {
      const gateCrasherDefy: Character = {
        ...validCharacter,
        playbook: 'gate-crasher',
        startingMoveId: 'defy-reality',
        hp: 1,
        maxHp: 5,
        resources: { slipstream: 5, strikes: 1, wards: 0, aether: 0 },
        inventory: [
          { id: 'test-item', name: 'Test Loot', kind: 'consumable' as const },
        ],
      };
      const twoStrikeEncounter = { type: 'basic' as const, name: 'Tough', strikes: 2, gold: 10 };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );
      act(() => result.current.setCharacter(gateCrasherDefy));
      act(() => result.current.setPlayerPos({ q: 0, r: 2 }));
      const startPos = { ...result.current.playerPos };
      const currencyBefore = result.current.progression.currency;

      act(() => result.current.engageEncounter('0,2', twoStrikeEncounter));

      expect(result.current.character!.hp).toBe(5);
      expect(result.current.inventory).toHaveLength(0);
      expect(result.current.playerPos).toEqual(startPos);
      expect(result.current.progression.currency).toBe(currencyBefore);
    });
  });

  describe('playbook moves: nexusSynthesizerHeal', () => {
    const riftWeaverNexus: Character = {
      ...validCharacter,
      playbook: 'rift-weaver',
      startingMoveId: 'nexus-synthesizer',
      hp: 2,
      maxHp: 5,
      resources: { slipstream: 5, strikes: 2, wards: 0, aether: 3 },
    };

    it('spends 2 Aether and restores 3 HP when Rift-Weaver with Nexus Synthesizer', () => {
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );
      act(() => result.current.setCharacter(riftWeaverNexus));

      let ok = false;
      act(() => {
        ok = result.current.nexusSynthesizerHeal();
      });

      expect(ok).toBe(true);
      expect(result.current.character!.hp).toBe(5);
      expect(result.current.resources.aether).toBe(1);
    });

    it('returns false when not Rift-Weaver with Nexus Synthesizer', () => {
      const toast = vi.fn();
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, toast })
      );
      act(() => result.current.setCharacter(validCharacter));

      let ok = true;
      act(() => {
        ok = result.current.nexusSynthesizerHeal();
      });

      expect(ok).toBe(false);
      expect(toast).toHaveBeenCalledWith('Nexus Synthesizer is a Rift-Weaver move.', 'error');
    });

    it('returns false when insufficient Aether', () => {
      const toast = vi.fn();
      const lowAether = { ...riftWeaverNexus, resources: { ...riftWeaverNexus.resources, aether: 1 } };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, toast })
      );
      act(() => result.current.setCharacter(lowAether));

      let ok = true;
      act(() => {
        ok = result.current.nexusSynthesizerHeal();
      });

      expect(ok).toBe(false);
      expect(toast).toHaveBeenCalledWith('Need 2 Aether for Nexus Synthesizer.', 'error');
    });
  });

  describe('playbook moves: onScoutHex', () => {
    const wayfinderScout: Character = {
      ...validCharacter,
      playbook: 'wayfinder',
      startingMoveId: 'scout-the-multiverse',
      resources: { slipstream: 5, strikes: 2, wards: 0, aether: 2 },
    };

    it('spends 1 Aether and adds hex to revealedHexes when hex is at distance 2', () => {
      const defaultMap = getDefaultMapState(COLS, ROWS, campaign.realm.startingHex);
      const { q, r } = defaultMap.playerPos;
      const ring2 = getHexIdsAtDistance(q, r, 2);
      expect(ring2.length).toBeGreaterThan(0);
      const hexToReveal = ring2[0];

      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );
      act(() => result.current.setCharacter(wayfinderScout));

      expect(result.current.revealedHexes.has(hexToReveal)).toBe(false);
      expect(result.current.resources.aether).toBe(2);

      let ok = false;
      act(() => {
        ok = result.current.onScoutHex(hexToReveal);
      });

      expect(ok).toBe(true);
      expect(result.current.revealedHexes.has(hexToReveal)).toBe(true);
      expect(result.current.resources.aether).toBe(1);
    });

    it('returns false and notifies when not Wayfinder with Scout the Multiverse', () => {
      const defaultMap = getDefaultMapState(COLS, ROWS, campaign.realm.startingHex);
      const ring2 = getHexIdsAtDistance(defaultMap.playerPos.q, defaultMap.playerPos.r, 2);
      const hexId = ring2[0];
      const toast = vi.fn();
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, toast })
      );
      act(() => result.current.setCharacter(validCharacter));

      let ok = true;
      act(() => {
        ok = result.current.onScoutHex(hexId);
      });

      expect(ok).toBe(false);
      expect(toast).toHaveBeenCalledWith('Scout the Multiverse is a Wayfinder move.', 'error');
      expect(result.current.revealedHexes.has(hexId)).toBe(false);
    });

    it('returns false when insufficient Aether', () => {
      const defaultMap = getDefaultMapState(COLS, ROWS, campaign.realm.startingHex);
      const ring2 = getHexIdsAtDistance(defaultMap.playerPos.q, defaultMap.playerPos.r, 2);
      const hexId = ring2[0];
      const toast = vi.fn();
      const noAether = { ...wayfinderScout, resources: { ...wayfinderScout.resources, aether: 0 } };
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, toast })
      );
      act(() => result.current.setCharacter(noAether));

      let ok = true;
      act(() => {
        ok = result.current.onScoutHex(hexId);
      });

      expect(ok).toBe(false);
      expect(toast).toHaveBeenCalledWith('Need 1 Aether to Scout. Log Wellness.', 'error');
      expect(result.current.revealedHexes.has(hexId)).toBe(false);
    });

    it('returns false when hex is not at distance 2', () => {
      const toast = vi.fn();
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, toast })
      );
      act(() => result.current.setCharacter(wayfinderScout));
      const ring2 = getHexIdsAtDistance(result.current.playerPos.q, result.current.playerPos.r, 2);
      const farHex = '99,99';
      expect(ring2).not.toContain(farHex);

      let ok = true;
      act(() => {
        ok = result.current.onScoutHex(farHex);
      });

      expect(ok).toBe(false);
      expect(toast).toHaveBeenCalledWith('You can only reveal a hex in the next ring (2 steps away).', 'error');
    });

    it('returns false when hex is already revealed and does not spend Aether', () => {
      const defaultMap = getDefaultMapState(COLS, ROWS, campaign.realm.startingHex);
      const ring2 = getHexIdsAtDistance(defaultMap.playerPos.q, defaultMap.playerPos.r, 2);
      const hexId = ring2[0];
      const toast = vi.fn();
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign, toast })
      );
      act(() => result.current.setCharacter(wayfinderScout));
      act(() => result.current.setRevealedHexes((prev) => new Set(prev).add(hexId)));

      let ok = true;
      act(() => {
        ok = result.current.onScoutHex(hexId);
      });

      expect(ok).toBe(false);
      expect(toast).toHaveBeenCalledWith('That hex is already revealed.', 'error');
      expect(result.current.resources.aether).toBe(2);
    });
  });

  describe('anchorUses state', () => {
    it('exposes anchorUses and initializes from load', () => {
      const mapState = getDefaultMapState(COLS, ROWS);
      (mapState as { anchorUses?: Record<string, boolean> }).anchorUses = { '3,3': true };
      saveGameState({ character: validCharacter, mapState });
      const { result } = renderHook(() =>
        useGameState({ cols: COLS, rows: ROWS, campaign })
      );
      expect(result.current.anchorUses['3,3']).toBe(true);
    });
  });
});
