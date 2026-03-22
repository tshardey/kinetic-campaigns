/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import {
  campaignRowsToCampaignPackage,
  type CampaignRow,
  type LootItemRow,
  type EncounterRow,
  type RiftRow,
  type DimensionalAnomalyRow,
} from './campaign-loader';

describe('campaignRowsToCampaignPackage', () => {
  const campaign: CampaignRow = {
    id: 'test-campaign',
    name: 'Test Realm',
    theme_description: 'A test.',
    grid_radius: 4,
    grid_cols: 14,
    grid_rows: 9,
    starting_hex: { q: 0, r: 0 },
    hero_image_url: 'https://example.com/hero.png',
    map_background_url: 'https://example.com/map.png',
    loot_frame_url: 'https://example.com/frame.png',
  };

  const loot: LootItemRow[] = [
    {
      campaign_id: 'test-campaign',
      id: 'loot-1',
      name: 'Potion',
      kind: 'consumable',
      description: 'Heals',
      image_url: 'https://example.com/potion.png',
    },
  ];

  const encounters: EncounterRow[] = [
    {
      campaign_id: 'test-campaign',
      id: 'enc-1',
      type: 'basic',
      name: 'Slime',
      strikes: 1,
      gold: 5,
      xp: 1,
      image_url: null,
      loot_item_id: 'loot-1',
      sort_order: 0,
    },
  ];

  const rifts: RiftRow[] = [
    {
      campaign_id: 'test-campaign',
      id: 'rift-1',
      name: 'Story',
      description: 'Desc',
      image_url: null,
      stages: [
        {
          id: 's1',
          name: 'Stage 1',
          costs: [{ resource: 'strikes' as const, amount: 1 }],
          description: 'Do it',
        },
      ],
      completion_xp: 2,
      completion_loot_item_id: 'loot-1',
      sort_order: 0,
    },
  ];

  const anomalies: DimensionalAnomalyRow[] = [
    {
      campaign_id: 'test-campaign',
      id: 'anom-1',
      name: 'Anomaly',
      image_url: null,
      cost: 1,
      resource: 'wards',
      resource_amount: 1,
      gold: 10,
      lore_text: 'Lore',
      sort_order: 0,
    },
  ];

  it('maps rows to CampaignPackage with realm, encounters, rifts, and anomalies', () => {
    const pkg = campaignRowsToCampaignPackage(campaign, loot, encounters, rifts, anomalies);
    expect(pkg.realm.id).toBe('test-campaign');
    expect(pkg.realm.startingHex).toEqual({ q: 0, r: 0 });
    expect(pkg.encounters).toHaveLength(1);
    expect(pkg.encounters[0].loot_drop?.id).toBe('loot-1');
    expect(pkg.rifts[0].stages).toHaveLength(1);
    expect(pkg.rifts[0].completion_loot?.id).toBe('loot-1');
    expect(pkg.anomalies[0].lore_text).toBe('Lore');
  });
});
