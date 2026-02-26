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
  statDelta?: Partial<CharacterStats>;
  parasolShieldActive?: boolean;
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
  return null;
}

/**
 * Get the consumable effect for an item. Caller applies deltas and removes item from inventory.
 * For vial-of-sun-catch, pass choice 'haste' or 'flow'.
 */
export function getConsumableEffect(
  itemId: string,
  choice?: 'haste' | 'flow'
): ConsumableResult | null {
  switch (itemId) {
    case 'vial-of-sun-catch':
      if (choice === 'haste') return { statDelta: { haste: 1 } };
      if (choice === 'flow') return { statDelta: { flow: 1 } };
      return null;
    case 'iron-silk-parasol':
      return { parasolShieldActive: true };
    case 'memory-censer':
      return { addStrikes: 1 };
    default:
      return null;
  }
}

/**
 * Whether this consumable requires a choice (e.g. Haste vs Flow) before use.
 */
export function consumableRequiresChoice(itemId: string): boolean {
  return itemId === 'vial-of-sun-catch';
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
