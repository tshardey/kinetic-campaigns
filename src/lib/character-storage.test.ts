import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCharacter, saveCharacter } from './character-storage';
import type { Character } from '@/types/character';

const CAMPAIGN_ID = 'omija';

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

describe('character-storage', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
  });

  describe('saveCharacter', () => {
    it('persists character as JSON', async () => {
      await saveCharacter(validCharacter, CAMPAIGN_ID);
      const raw = mockStorage.getItem('kinetic-campaigns-character');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!) as Character;
      expect(parsed.name).toBe(validCharacter.name);
      expect(parsed.playbook).toBe(validCharacter.playbook);
      expect(parsed.stats).toEqual(validCharacter.stats);
    });
  });

  describe('loadCharacter', () => {
    it('returns null when nothing stored', async () => {
      await expect(loadCharacter(CAMPAIGN_ID)).resolves.toBeNull();
    });

    it('returns character after saveCharacter', async () => {
      await saveCharacter(validCharacter, CAMPAIGN_ID);
      const loaded = await loadCharacter(CAMPAIGN_ID);
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe(validCharacter.name);
      expect(loaded!.playbook).toBe(validCharacter.playbook);
      expect(loaded!.startingMoveId).toBe(validCharacter.startingMoveId);
      expect(loaded!.stats).toEqual(validCharacter.stats);
      expect(loaded!.resources).toEqual(validCharacter.resources);
      expect(loaded!.progression).toEqual(validCharacter.progression);
    });

    it('returns null when stored data is invalid JSON', async () => {
      mockStorage.setItem('kinetic-campaigns-character', 'not json');
      await expect(loadCharacter(CAMPAIGN_ID)).resolves.toBeNull();
    });

    it('returns null when stored object missing name', async () => {
      const bad = { ...validCharacter, name: '' };
      mockStorage.setItem('kinetic-campaigns-character', JSON.stringify(bad));
      await expect(loadCharacter(CAMPAIGN_ID)).resolves.toBeNull();
    });

    it('returns null when stored object missing playbook', async () => {
      const bad = { ...validCharacter, playbook: undefined };
      mockStorage.setItem('kinetic-campaigns-character', JSON.stringify(bad));
      await expect(loadCharacter(CAMPAIGN_ID)).resolves.toBeNull();
    });

    it('returns null when stored object missing stats', async () => {
      const bad = { ...validCharacter, stats: undefined };
      mockStorage.setItem('kinetic-campaigns-character', JSON.stringify(bad));
      await expect(loadCharacter(CAMPAIGN_ID)).resolves.toBeNull();
    });

    it('returns null when stored object missing startingMoveId', async () => {
      const bad = { ...validCharacter, startingMoveId: undefined };
      mockStorage.setItem('kinetic-campaigns-character', JSON.stringify(bad));
      await expect(loadCharacter(CAMPAIGN_ID)).resolves.toBeNull();
    });

    it('returns null when JSON.parse throws', async () => {
      mockStorage.setItem('kinetic-campaigns-character', '{{{');
      await expect(loadCharacter(CAMPAIGN_ID)).resolves.toBeNull();
    });
  });

  describe('round-trip', () => {
    it('save then load preserves character', async () => {
      await saveCharacter(validCharacter, CAMPAIGN_ID);
      const loaded = await loadCharacter(CAMPAIGN_ID);
      expect(loaded).toEqual(validCharacter);
    });
  });
});
