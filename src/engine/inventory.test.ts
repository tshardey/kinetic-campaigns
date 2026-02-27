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
  it('returns addSlipstream 2 for vial-of-sun-catch', () => {
    const result = getConsumableEffect('vial-of-sun-catch');
    expect(result).toEqual({ addSlipstream: 2 });
  });

  it('returns addWards 1 for iron-silk-parasol', () => {
    const result = getConsumableEffect('iron-silk-parasol');
    expect(result).toEqual({ addWards: 1 });
  });

  it('returns addStrikes 1 for memory-censer', () => {
    const result = getConsumableEffect('memory-censer');
    expect(result).toEqual({ addStrikes: 1 });
  });

  it('returns null for unknown consumable id', () => {
    expect(getConsumableEffect('unknown-item')).toBeNull();
    expect(getConsumableEffect('talon-of-the-west-wind')).toBeNull();
  });
});

describe('consumableRequiresChoice', () => {
  it('returns false for all items (no consumable requires choice)', () => {
    expect(consumableRequiresChoice('vial-of-sun-catch')).toBe(false);
    expect(consumableRequiresChoice('iron-silk-parasol')).toBe(false);
    expect(consumableRequiresChoice('memory-censer')).toBe(false);
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
      description: 'Use: Grants +2 Slipstream.',
      image_url: '/path/to/vial.png',
    };
    const item = lootDropToInventoryItem(drop);
    expect(item).toEqual({
      id: 'vial-of-sun-catch',
      name: 'Vial of Sun-Catch',
      kind: 'consumable',
      description: 'Use: Grants +2 Slipstream.',
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
