import { describe, it, expect } from 'vitest';
import {
  applyArtifactOnAcquisition,
  getConsumableEffect,
  consumableRequiresChoice,
  lootDropToInventoryItem,
} from './inventory';
import type { CharacterStats } from '@/types/character';
import type { EncounterLootDrop } from '@/types/campaign';

const baseStats: CharacterStats = {
  brawn: 2,
  flow: 0,
  haste: 1,
  focus: -1,
};

describe('applyArtifactOnAcquisition', () => {
  it('increases haste by 1 for talon-of-the-west-wind', () => {
    const result = applyArtifactOnAcquisition('talon-of-the-west-wind', baseStats);
    expect(result).toEqual({ ...baseStats, haste: 2 });
  });

  it('returns null for unknown artifact id', () => {
    expect(applyArtifactOnAcquisition('unknown-artifact', baseStats)).toBeNull();
    expect(applyArtifactOnAcquisition('vial-of-sun-catch', baseStats)).toBeNull();
  });

  it('preserves other stats when applying talon buff', () => {
    const result = applyArtifactOnAcquisition('talon-of-the-west-wind', baseStats);
    expect(result?.brawn).toBe(baseStats.brawn);
    expect(result?.flow).toBe(baseStats.flow);
    expect(result?.focus).toBe(baseStats.focus);
  });
});

describe('getConsumableEffect', () => {
  it('returns stat delta for vial-of-sun-catch with haste choice', () => {
    const result = getConsumableEffect('vial-of-sun-catch', 'haste');
    expect(result).toEqual({ statDelta: { haste: 1 } });
  });

  it('returns stat delta for vial-of-sun-catch with flow choice', () => {
    const result = getConsumableEffect('vial-of-sun-catch', 'flow');
    expect(result).toEqual({ statDelta: { flow: 1 } });
  });

  it('returns null for vial-of-sun-catch without choice', () => {
    expect(getConsumableEffect('vial-of-sun-catch')).toBeNull();
    expect(getConsumableEffect('vial-of-sun-catch', undefined)).toBeNull();
  });

  it('returns parasolShieldActive for iron-silk-parasol', () => {
    const result = getConsumableEffect('iron-silk-parasol');
    expect(result).toEqual({ parasolShieldActive: true });
  });

  it('returns addStrikes for memory-censer', () => {
    const result = getConsumableEffect('memory-censer');
    expect(result).toEqual({ addStrikes: 1 });
  });

  it('returns null for unknown consumable id', () => {
    expect(getConsumableEffect('unknown-item')).toBeNull();
    expect(getConsumableEffect('talon-of-the-west-wind')).toBeNull();
  });
});

describe('consumableRequiresChoice', () => {
  it('returns true for vial-of-sun-catch', () => {
    expect(consumableRequiresChoice('vial-of-sun-catch')).toBe(true);
  });

  it('returns false for other consumables', () => {
    expect(consumableRequiresChoice('iron-silk-parasol')).toBe(false);
    expect(consumableRequiresChoice('memory-censer')).toBe(false);
  });

  it('returns false for artifact and unknown ids', () => {
    expect(consumableRequiresChoice('talon-of-the-west-wind')).toBe(false);
    expect(consumableRequiresChoice('unknown')).toBe(false);
  });
});

describe('lootDropToInventoryItem', () => {
  it('maps encounter loot drop to inventory item', () => {
    const drop: EncounterLootDrop = {
      id: 'vial-of-sun-catch',
      name: 'Vial of Sun-Catch',
      kind: 'consumable',
      description: 'Use: Instantly restores 1 Haste or 1 Flow.',
      image_url: '/path/to/vial.png',
    };
    const item = lootDropToInventoryItem(drop);
    expect(item).toEqual({
      id: 'vial-of-sun-catch',
      name: 'Vial of Sun-Catch',
      kind: 'consumable',
      description: 'Use: Instantly restores 1 Haste or 1 Flow.',
      image_url: '/path/to/vial.png',
    });
  });

  it('maps artifact loot drop', () => {
    const drop: EncounterLootDrop = {
      id: 'talon-of-the-west-wind',
      name: 'Talon of the West Wind',
      kind: 'artifact',
      description: 'Permanently buffs Haste.',
    };
    const item = lootDropToInventoryItem(drop);
    expect(item.kind).toBe('artifact');
    expect(item.id).toBe('talon-of-the-west-wind');
    expect(item.description).toBe('Permanently buffs Haste.');
  });

  it('handles minimal drop without description or image', () => {
    const drop: EncounterLootDrop = {
      id: 'minimal',
      name: 'Minimal Item',
      kind: 'consumable',
    };
    const item = lootDropToInventoryItem(drop);
    expect(item).toEqual({ id: 'minimal', name: 'Minimal Item', kind: 'consumable' });
    expect(item.description).toBeUndefined();
    expect(item.image_url).toBeUndefined();
  });
});
