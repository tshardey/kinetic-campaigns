import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadGameState,
  saveGameState,
  getDefaultMapState,
  type PersistedGameState,
  type MapState,
} from './game-state-storage';
import { saveCharacter } from './character-storage';
import type { Character } from '@/types/character';
import { getDefaultStartHexId } from '@/engine/encounter-placement';

const validCharacter: Character = {
  name: 'Test',
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

describe('game-state-storage', () => {
  let mockStorage: Storage;
  const COLS = 14;
  const ROWS = 9;

  beforeEach(() => {
    mockStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
  });

  describe('getDefaultMapState', () => {
    it('returns playerPos at default start hex', () => {
      const startHexId = getDefaultStartHexId(COLS, ROWS);
      const [q, r] = startHexId.split(',').map(Number);
      const map = getDefaultMapState(COLS, ROWS);
      expect(map.playerPos).toEqual({ q, r });
    });

    it('includes start hex and adjacent hexes in revealedHexes', () => {
      const startHexId = getDefaultStartHexId(COLS, ROWS);
      const map = getDefaultMapState(COLS, ROWS);
      expect(map.revealedHexes).toContain(startHexId);
      expect(map.revealedHexes.length).toBeGreaterThan(1);
    });

    it('returns empty clearedHexes', () => {
      const map = getDefaultMapState(COLS, ROWS);
      expect(map.clearedHexes).toEqual([]);
    });

    it('returns empty riftProgress', () => {
      const map = getDefaultMapState(COLS, ROWS);
      expect(map.riftProgress).toEqual({});
    });

    it('returns empty encounterHealth', () => {
      const map = getDefaultMapState(COLS, ROWS);
      expect(map.encounterHealth).toEqual({});
    });

    it('returns different playerPos for different grid sizes', () => {
      const map14x9 = getDefaultMapState(14, 9);
      const map8x6 = getDefaultMapState(8, 6);
      expect(map14x9.playerPos).not.toEqual(map8x6.playerPos);
    });
  });

  describe('saveGameState / loadGameState', () => {
    it('returns null when nothing stored', () => {
      expect(loadGameState(COLS, ROWS)).toBeNull();
    });

    it('persists and restores full game state', () => {
      const mapState: MapState = {
        playerPos: { q: 1, r: 2 },
        revealedHexes: ['0,1', '1,1', '1,2', '2,2'],
        clearedHexes: ['1,1'],
      };
      const state: PersistedGameState = {
        character: { ...validCharacter, inventory: [] },
        mapState,
      };
      saveGameState(state);
      const loaded = loadGameState(COLS, ROWS);
      expect(loaded).not.toBeNull();
      expect(loaded!.character.name).toBe(validCharacter.name);
      expect(loaded!.character.resources).toEqual(validCharacter.resources);
      expect(loaded!.mapState.playerPos).toEqual(mapState.playerPos);
      expect(loaded!.mapState.revealedHexes).toEqual(mapState.revealedHexes);
      expect(loaded!.mapState.clearedHexes).toEqual(mapState.clearedHexes);
    });

    it('returns null when stored data is invalid JSON', () => {
      mockStorage.setItem('kinetic-campaigns-game-state', 'not json');
      expect(loadGameState(COLS, ROWS)).toBeNull();
    });

    it('returns null when game state has invalid character (missing name)', () => {
      const state: PersistedGameState = {
        character: { ...validCharacter, name: '' },
        mapState: getDefaultMapState(COLS, ROWS),
      };
      saveGameState(state);
      expect(loadGameState(COLS, ROWS)).toBeNull();
    });

    it('round-trip preserves character and map state', () => {
      const mapState = getDefaultMapState(COLS, ROWS);
      mapState.clearedHexes.push('2,3');
      const state: PersistedGameState = {
        character: { ...validCharacter, progression: { xp: 2, level: 1, currency: 200 } },
        mapState,
      };
      saveGameState(state);
      const loaded = loadGameState(COLS, ROWS);
      expect(loaded!.character.progression.currency).toBe(200);
      expect(loaded!.mapState.clearedHexes).toContain('2,3');
    });

    it('persists and restores encounterHealth', () => {
      const mapState: MapState = {
        ...getDefaultMapState(COLS, ROWS),
        encounterHealth: { '3,4': 2, '5,6': 1 },
      };
      const state: PersistedGameState = {
        character: validCharacter,
        mapState,
      };
      saveGameState(state);
      const loaded = loadGameState(COLS, ROWS);
      expect(loaded!.mapState.encounterHealth).toEqual({ '3,4': 2, '5,6': 1 });
    });
  });

  describe('loadGameState legacy migration', () => {
    it('migrates from legacy character-only key and uses default map state', () => {
      saveCharacter(validCharacter);
      const loaded = loadGameState(COLS, ROWS);
      expect(loaded).not.toBeNull();
      expect(loaded!.character.name).toBe(validCharacter.name);
      expect(loaded!.character.playbook).toBe(validCharacter.playbook);
      const startHexId = getDefaultStartHexId(COLS, ROWS);
      expect(loaded!.mapState.revealedHexes).toContain(startHexId);
      expect(loaded!.mapState.clearedHexes).toEqual([]);
    });

    it('prefers new game-state key over legacy when both exist', () => {
      saveCharacter(validCharacter);
      const customState: PersistedGameState = {
        character: { ...validCharacter, name: 'FromNewKey' },
        mapState: { playerPos: { q: 5, r: 5 }, revealedHexes: ['5,5'], clearedHexes: [] },
      };
      saveGameState(customState);
      const loaded = loadGameState(COLS, ROWS);
      expect(loaded!.character.name).toBe('FromNewKey');
      expect(loaded!.mapState.playerPos).toEqual({ q: 5, r: 5 });
    });

    it('round-trip preserves pendingLevelUp and pendingProgressionAfterLevelUp', () => {
      const mapState = getDefaultMapState(COLS, ROWS);
      const state: PersistedGameState = {
        character: { ...validCharacter, progression: { xp: 10, level: 1, currency: 100 } },
        mapState,
        pendingLevelUp: true,
        pendingProgressionAfterLevelUp: { xp: 3, level: 2, currency: 100 },
      };
      saveGameState(state);
      const loaded = loadGameState(COLS, ROWS);
      expect(loaded).not.toBeNull();
      expect(loaded!.pendingLevelUp).toBe(true);
      expect(loaded!.pendingProgressionAfterLevelUp).toEqual({
        xp: 3,
        level: 2,
        currency: 100,
      });
    });
  });
});
