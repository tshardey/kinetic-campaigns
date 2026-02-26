/**
 * Persist and load character from localStorage (Phase 1 static save).
 */

import type { Character } from '@/types/character';

const STORAGE_KEY = 'kinetic-campaigns-character';
const DEFAULT_HP = 5;

function ensureCharacterHp(c: Character): Character {
  if (typeof c.hp !== 'number' || typeof c.maxHp !== 'number') {
    return { ...c, hp: DEFAULT_HP, maxHp: DEFAULT_HP };
  }
  return c;
}

export function loadCharacter(): Character | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Character;
    if (!data.name || !data.playbook || !data.startingMoveId || !data.stats) return null;
    return ensureCharacterHp(data);
  } catch {
    return null;
  }
}

export function saveCharacter(character: Character): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(character));
}
