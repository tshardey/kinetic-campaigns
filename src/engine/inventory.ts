/**
 * Inventory and loot effects: consumable use and artifact stat application.
 */

import type { CharacterStats } from '@/types/character';
import type { InventoryItem } from '@/types/character';
import type { EncounterLootDrop } from '@/types/campaign';

/** Result of using a consumable: deltas to apply. Caller merges with current state. */
export interface ConsumableResult {
  addStrikes?: number;
  addSlipstream?: number;
  addWards?: number;
  statDelta?: Partial<CharacterStats>;
}

/**
 * Apply artifact stat buff on acquisition. Returns updated stats or null if no change.
 */
export function applyArtifactOnAcquisition(
  itemId: string,
  currentStats: CharacterStats
): CharacterStats | null {
  if (itemId === 'talon-of-the-west-wind') {
    return { ...currentStats, haste: currentStats.haste + 1 };
  }
  if (itemId === 'moon-cat-coin') {
    return { ...currentStats, focus: currentStats.focus + 1 };
  }
  return null;
}

/**
 * Get the consumable effect for an item. Caller applies deltas and removes item from inventory.
 */
export function getConsumableEffect(itemId: string): ConsumableResult | null {
  switch (itemId) {
    case 'vial-of-sun-catch':
      return { addSlipstream: 2 };
    case 'iron-silk-parasol':
      return { addWards: 1 };
    case 'memory-censer':
      return { addStrikes: 1 };
    default:
      return null;
  }
}

/**
 * Whether this consumable requires a choice (e.g. Haste vs Flow) before use.
 */
export function consumableRequiresChoice(_itemId: string): boolean {
  return false;
}

/** Convert campaign loot drop to inventory item. */
export function lootDropToInventoryItem(drop: EncounterLootDrop): InventoryItem {
  return {
    id: drop.id,
    name: drop.name,
    kind: drop.kind,
    description: drop.description,
    image_url: drop.image_url,
  };
}
