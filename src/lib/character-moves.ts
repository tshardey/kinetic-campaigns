import type { Character } from '@/types/character';

export function getCharacterMoveIds(character: Character | null | undefined): Set<string> {
  if (!character) return new Set();
  return new Set([character.startingMoveId, ...(character.learnedMoveIds ?? [])]);
}

export function hasCharacterMove(
  character: Character | null | undefined,
  moveId: string
): boolean {
  return getCharacterMoveIds(character).has(moveId);
}
