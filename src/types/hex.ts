/**
 * Hex grid types: axial/cube coordinates, cells, and map state.
 */

/** Axial coordinates (q, r) for a hex cell. */
export interface AxialCoord {
  q: number;
  r: number;
}

/** Cube coordinates (q, r, s) where q + r + s = 0. */
export interface CubeCoord extends AxialCoord {
  s: number;
}

/** A single hex cell in the grid with a stable string id. */
export interface HexCell {
  q: number;
  r: number;
  id: string;
}

/** Player position on the map (axial). */
export type PlayerPosition = AxialCoord;

/** Set of hex cell ids that have been revealed (fog of war). */
export type RevealedHexes = Set<string>;

/** Set of hex cell ids that have been cleared (encounter completed). */
export type ClearedHexes = Set<string>;

/** Full map state for the current realm. */
export interface MapState {
  playerPos: PlayerPosition;
  revealedHexes: RevealedHexes;
  clearedHexes: ClearedHexes;
}
