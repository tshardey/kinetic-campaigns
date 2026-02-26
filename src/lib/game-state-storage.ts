/**
 * Persist and load full game state (character + map state) from localStorage.
 * Supports migration from legacy character-only key.
 */

import type { Character } from '@/types/character';
import { getDefaultStartHexId } from '@/engine/encounter-placement';
import { getAdjacentHexIds } from '@/engine/hex-math';

const GAME_STATE_KEY = 'kinetic-campaigns-game-state';
const LEGACY_CHARACTER_KEY = 'kinetic-campaigns-character';

export interface MapState {
  playerPos: { q: number; r: number };
  revealedHexes: string[];
  clearedHexes: string[];
}

export interface PersistedGameState {
  character: Character;
  mapState: MapState;
}

export function getDefaultMapState(cols: number, rows: number): MapState {
  const startHexId = getDefaultStartHexId(cols, rows);
  const [q, r] = startHexId.split(',').map(Number);
  const revealed = new Set<string>([startHexId]);
  getAdjacentHexIds(q, r).forEach((id) => revealed.add(id));
  return {
    playerPos: { q, r },
    revealedHexes: Array.from(revealed),
    clearedHexes: [],
  };
}

function parseLegacyCharacter(): Character | null {
  try {
    const raw = localStorage.getItem(LEGACY_CHARACTER_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Character;
    if (!data.name || !data.playbook || !data.startingMoveId || !data.stats) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Load full game state from localStorage.
 * Tries new key first; falls back to legacy character-only key and default map state.
 */
export function loadGameState(cols: number, rows: number): PersistedGameState | null {
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as PersistedGameState;
      if (data.character && data.mapState) {
        const c = data.character;
        if (c.name && c.playbook && c.startingMoveId && c.stats) {
          return data;
        }
      }
    }
    const legacy = parseLegacyCharacter();
    if (legacy) {
      return {
        character: legacy,
        mapState: getDefaultMapState(cols, rows),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Persist full game state to localStorage.
 */
export function saveGameState(state: PersistedGameState): void {
  localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
}
