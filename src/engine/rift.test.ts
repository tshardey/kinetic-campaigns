import { describe, it, expect } from 'vitest';
import {
  canAffordRiftStage,
  spendForRiftStage,
  getRiftStageCostLabel,
  getRiftStageCosts,
  canPassRiftStage,
  getRequiredStatLabel,
} from './rift';
import type { CharacterResources, CharacterStats } from '@/types/character';
import type { NarrativeRiftStage } from '@/types/campaign';

const defaultResources: CharacterResources = {
  slipstream: 5,
  strikes: 2,
  wards: 0,
  aether: 1,
};

const defaultStats: CharacterStats = {
  brawn: 1,
  flow: 0,
  haste: 0,
  focus: -1,
};

describe('canAffordRiftStage', () => {
  it('returns true when stage has cost and player has enough resource', () => {
    const stage: NarrativeRiftStage = {
      id: 's1',
      name: 'Stage 1',
      cost: { resource: 'strikes', amount: 1 },
      description: '',
    };
    expect(canAffordRiftStage(defaultResources, defaultStats, stage)).toBe(true);
    expect(canAffordRiftStage({ ...defaultResources, strikes: 0 }, defaultStats, stage)).toBe(false);
  });

  it('returns true when stage has slipstream cost and player has enough', () => {
    const stage: NarrativeRiftStage = {
      id: 's2',
      name: 'Stage 2',
      cost: { resource: 'slipstream', amount: 1 },
      description: '',
    };
    expect(canAffordRiftStage(defaultResources, defaultStats, stage)).toBe(true);
    expect(canAffordRiftStage({ ...defaultResources, slipstream: 0 }, defaultStats, stage)).toBe(false);
  });

  it('returns true when stage has required_stat and stat >= 1 (legacy)', () => {
    const stage: NarrativeRiftStage = {
      id: 's3',
      name: 'Stage 3',
      required_stat: 'Brawn',
      description: '',
    };
    expect(canAffordRiftStage(defaultResources, defaultStats, stage)).toBe(true);
    expect(canAffordRiftStage(defaultResources, { ...defaultStats, brawn: 0 }, stage)).toBe(false);
  });

  it('returns true when stage has no cost and no required_stat', () => {
    const stage: NarrativeRiftStage = {
      id: 's4',
      name: 'Stage 4',
      description: '',
    };
    expect(canAffordRiftStage(defaultResources, defaultStats, stage)).toBe(true);
  });

  it('prefers cost over required_stat when both set', () => {
    const stage: NarrativeRiftStage = {
      id: 's5',
      name: 'Stage 5',
      cost: { resource: 'wards', amount: 1 },
      required_stat: 'Brawn',
      description: '',
    };
    expect(canAffordRiftStage({ ...defaultResources, wards: 1 }, defaultStats, stage)).toBe(true);
    expect(canAffordRiftStage(defaultResources, defaultStats, stage)).toBe(false);
  });

  it('requires all resources when stage has costs array', () => {
    const stage: NarrativeRiftStage = {
      id: 's6',
      name: 'Stage 6',
      costs: [
        { resource: 'strikes', amount: 1 },
        { resource: 'slipstream', amount: 1 },
        { resource: 'wards', amount: 1 },
      ],
      description: '',
    };
    const res = { slipstream: 5, strikes: 2, wards: 1, aether: 1 };
    expect(canAffordRiftStage(res, defaultStats, stage)).toBe(true);
    expect(canAffordRiftStage({ ...res, wards: 0 }, defaultStats, stage)).toBe(false);
    expect(canAffordRiftStage({ ...res, strikes: 0 }, defaultStats, stage)).toBe(false);
  });
});

describe('spendForRiftStage', () => {
  it('spends strikes when stage cost is strikes', () => {
    const stage: NarrativeRiftStage = {
      id: 's1',
      name: 'S1',
      cost: { resource: 'strikes', amount: 2 },
      description: '',
    };
    const next = spendForRiftStage(defaultResources, stage);
    expect(next).not.toBeNull();
    expect(next!.strikes).toBe(0);
    expect(spendForRiftStage({ ...defaultResources, strikes: 1 }, stage)).toBeNull();
  });

  it('returns current resources when stage has no cost', () => {
    const stage: NarrativeRiftStage = {
      id: 's2',
      name: 'S2',
      description: '',
    };
    const next = spendForRiftStage(defaultResources, stage);
    expect(next).toEqual(defaultResources);
  });

  it('spends slipstream and wards', () => {
    const res = { ...defaultResources, wards: 2 };
    const stage: NarrativeRiftStage = {
      id: 's3',
      name: 'S3',
      cost: { resource: 'wards', amount: 1 },
      description: '',
    };
    const next = spendForRiftStage(res, stage);
    expect(next!.wards).toBe(1);
  });

  it('spends multiple cost types when stage has costs array', () => {
    const res = { slipstream: 5, strikes: 2, wards: 1, aether: 1 };
    const stage: NarrativeRiftStage = {
      id: 's4',
      name: 'S4',
      costs: [
        { resource: 'strikes', amount: 1 },
        { resource: 'slipstream', amount: 1 },
        { resource: 'wards', amount: 1 },
      ],
      description: '',
    };
    const next = spendForRiftStage(res, stage);
    expect(next).not.toBeNull();
    expect(next!.strikes).toBe(1);
    expect(next!.slipstream).toBe(4);
    expect(next!.wards).toBe(0);
  });
});

describe('getRiftStageCostLabel', () => {
  it('returns activity hint for strikes', () => {
    const stage: NarrativeRiftStage = {
      id: 's1',
      name: 'S1',
      cost: { resource: 'strikes', amount: 1 },
      description: '',
    };
    expect(getRiftStageCostLabel(stage)).toBe('1 Strike (log Strength)');
  });

  it('formats multiple costs with + when stage has costs array', () => {
    const stage: NarrativeRiftStage = {
      id: 's1b',
      name: 'S1b',
      costs: [
        { resource: 'strikes', amount: 1 },
        { resource: 'slipstream', amount: 1 },
        { resource: 'wards', amount: 1 },
      ],
      description: '',
    };
    expect(getRiftStageCostLabel(stage)).toBe(
      '1 Strike (log Strength) + 1 Slipstream (log Cardio) + 1 Ward (log Agility)'
    );
  });

  it('returns activity hint for slipstream and wards', () => {
    expect(
      getRiftStageCostLabel({
        id: 's',
        name: 'S',
        cost: { resource: 'slipstream', amount: 1 },
        description: '',
      })
    ).toBe('1 Slipstream (log Cardio)');
    expect(
      getRiftStageCostLabel({
        id: 's',
        name: 'S',
        cost: { resource: 'wards', amount: 1 },
        description: '',
      })
    ).toBe('1 Ward (log Agility)');
  });

  it('returns stat label for legacy required_stat', () => {
    const stage: NarrativeRiftStage = {
      id: 's',
      name: 'S',
      required_stat: 'Flow',
      description: '',
    };
    expect(getRiftStageCostLabel(stage)).toBe('Flow ≥ 1');
  });
});

describe('getRiftStageCosts', () => {
  it('returns costs array when set', () => {
    const stage: NarrativeRiftStage = {
      id: 's',
      name: 'S',
      costs: [{ resource: 'strikes', amount: 2 }],
      description: '',
    };
    expect(getRiftStageCosts(stage)).toEqual([{ resource: 'strikes', amount: 2 }]);
  });

  it('returns [cost] when only cost is set', () => {
    const stage: NarrativeRiftStage = {
      id: 's',
      name: 'S',
      cost: { resource: 'wards', amount: 1 },
      description: '',
    };
    expect(getRiftStageCosts(stage)).toEqual([{ resource: 'wards', amount: 1 }]);
  });
});

describe('canPassRiftStage (legacy)', () => {
  it('returns false when stage has cost (caller should use canAffordRiftStage)', () => {
    const stage: NarrativeRiftStage = {
      id: 's',
      name: 'S',
      cost: { resource: 'strikes', amount: 1 },
      description: '',
    };
    expect(canPassRiftStage(defaultStats, stage)).toBe(false);
  });

  it('returns true when required_stat is met', () => {
    const stage: NarrativeRiftStage = {
      id: 's',
      name: 'S',
      required_stat: 'Brawn',
      description: '',
    };
    expect(canPassRiftStage(defaultStats, stage)).toBe(true);
    expect(canPassRiftStage({ ...defaultStats, brawn: 0 }, stage)).toBe(false);
  });
});

describe('getRequiredStatLabel', () => {
  it('returns label for known stat', () => {
    expect(getRequiredStatLabel({ id: 's', name: 'S', required_stat: 'Brawn', description: '' })).toBe('Brawn');
    expect(getRequiredStatLabel({ id: 's', name: 'S', required_stat: 'Flow', description: '' })).toBe('Flow');
  });

  it('returns empty string when no required_stat', () => {
    expect(getRequiredStatLabel({ id: 's', name: 'S', description: '' })).toBe('');
  });
});
