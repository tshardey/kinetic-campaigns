/**
 * Axial/cube hex grid math and grid generation. Pure logic, no UI.
 */

import type { AxialCoord, HexCell } from '@/types/hex';

/** Default hex size (radius) for pixel layout. */
export const DEFAULT_HEX_SIZE = 40;

/** Axial directions for pointy-topped hexes: E, SE, SW, W, NW, NE. */
const AXIAL_NEIGHBORS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

/**
 * Convert axial coordinates (q, r) to pixel coordinates (x, y).
 */
export function hexToPixel(
  q: number,
  r: number,
  size: number = DEFAULT_HEX_SIZE
): { x: number; y: number } {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return { x, y };
}

/**
 * Generate the six points for a pointy-topped SVG polygon (centered at origin).
 */
export function getHexPoints(size: number = DEFAULT_HEX_SIZE): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    points.push(`${size * Math.cos(angleRad)},${size * Math.sin(angleRad)}`);
  }
  return points.join(' ');
}

/**
 * Generate a hexagonal grid of a given radius (axial coordinates).
 */
export function generateGrid(radius: number): HexCell[] {
  const grid: HexCell[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      grid.push({ q, r, id: `${q},${r}` });
    }
  }
  return grid;
}

/**
 * Cube distance between two axial hexes (number of steps).
 */
export function hexDistance(a: AxialCoord, b: AxialCoord): number {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs(-a.q - a.r - (-b.q - b.r));
  return Math.max(dq, dr, ds);
}

/**
 * Whether two hexes are adjacent (distance === 1).
 */
export function areAdjacent(a: AxialCoord, b: AxialCoord): boolean {
  return hexDistance(a, b) === 1;
}

/**
 * Get axial deltas for the six neighbors of (q, r).
 */
export function getNeighborDeltas(): ReadonlyArray<[number, number]> {
  return AXIAL_NEIGHBORS;
}

/**
 * Get the hex ids for the six cells adjacent to (q, r).
 */
export function getAdjacentHexIds(q: number, r: number): string[] {
  return AXIAL_NEIGHBORS.map(([dq, dr]) => `${q + dq},${r + dr}`);
}
