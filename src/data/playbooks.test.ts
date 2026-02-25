import { describe, it, expect } from 'vitest';
import { PLAYBOOKS, getPlaybook, buildCharacter } from './playbooks';

describe('PLAYBOOKS', () => {
  it('has exactly three playbooks', () => {
    expect(PLAYBOOKS).toHaveLength(3);
  });

  it('each playbook has id, name, description, stats, and startingMoves', () => {
    for (const p of PLAYBOOKS) {
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.description).toBeDefined();
      expect(p.stats).toMatchObject({
        brawn: expect.any(Number),
        flow: expect.any(Number),
        haste: expect.any(Number),
        focus: expect.any(Number),
      });
      expect(Array.isArray(p.startingMoves)).toBe(true);
      expect(p.startingMoves.length).toBe(3);
    }
  });

  it('each starting move has id, name, description', () => {
    for (const p of PLAYBOOKS) {
      for (const m of p.startingMoves) {
        expect(m.id).toBeDefined();
        expect(m.name).toBeDefined();
        expect(m.description).toBeDefined();
      }
    }
  });

  it('defines rift-weaver, gate-crasher, wayfinder with correct stat ranges', () => {
    const ids = PLAYBOOKS.map((p) => p.id).sort();
    expect(ids).toEqual(['gate-crasher', 'rift-weaver', 'wayfinder']);

    const riftWeaver = PLAYBOOKS.find((p) => p.id === 'rift-weaver')!;
    expect(riftWeaver.stats).toEqual({ brawn: -1, flow: 2, haste: 0, focus: 1 });

    const gateCrasher = PLAYBOOKS.find((p) => p.id === 'gate-crasher')!;
    expect(gateCrasher.stats).toEqual({ brawn: 2, flow: 0, haste: 1, focus: -1 });

    const wayfinder = PLAYBOOKS.find((p) => p.id === 'wayfinder')!;
    expect(wayfinder.stats).toEqual({ brawn: 0, flow: 1, haste: 2, focus: -1 });
  });
});

describe('getPlaybook', () => {
  it('returns playbook when id exists', () => {
    expect(getPlaybook('rift-weaver')).toBe(PLAYBOOKS[0]);
    expect(getPlaybook('gate-crasher')).toBe(PLAYBOOKS[1]);
    expect(getPlaybook('wayfinder')).toBe(PLAYBOOKS[2]);
  });

  it('returns undefined for unknown id', () => {
    expect(getPlaybook('unknown')).toBeUndefined();
    expect(getPlaybook('')).toBeUndefined();
  });
});

describe('buildCharacter', () => {
  it('returns character with playbook stats and default resources/progression', () => {
    const c = buildCharacter('Alice', 'gate-crasher', 'momentum-strike');
    expect(c.name).toBe('Alice');
    expect(c.playbook).toBe('gate-crasher');
    expect(c.startingMoveId).toBe('momentum-strike');
    expect(c.stats).toEqual({ brawn: 2, flow: 0, haste: 1, focus: -1 });
    expect(c.resources).toEqual({ slipstream: 5, strikes: 2, wards: 0, aether: 1 });
    expect(c.progression).toEqual({ xp: 0, level: 1, currency: 120 });
  });

  it('trims name and uses Worldhopper when empty', () => {
    const c = buildCharacter('  ', 'wayfinder', 'phase-strike');
    expect(c.name).toBe('Worldhopper');
    const c2 = buildCharacter('', 'rift-weaver', 'aether-shield');
    expect(c2.name).toBe('Worldhopper');
  });

  it('uses trimmed name when non-empty', () => {
    const c = buildCharacter('  Bob  ', 'rift-weaver', 'nexus-synthesizer');
    expect(c.name).toBe('Bob');
  });

  it('throws for unknown playbook', () => {
    expect(() => buildCharacter('A', 'invalid-playbook', 'aether-shield')).toThrow(
      'Unknown playbook: invalid-playbook'
    );
  });

  it('throws for unknown starting move for playbook', () => {
    expect(() => buildCharacter('A', 'rift-weaver', 'momentum-strike')).toThrow(
      'Unknown starting move: momentum-strike for playbook rift-weaver'
    );
  });

  it('builds valid character for every playbook and each starting move', () => {
    for (const p of PLAYBOOKS) {
      for (const m of p.startingMoves) {
        const c = buildCharacter('Test', p.id, m.id);
        expect(c.name).toBe('Test');
        expect(c.playbook).toBe(p.id);
        expect(c.startingMoveId).toBe(m.id);
        expect(c.stats).toEqual(p.stats);
      }
    }
  });
});
