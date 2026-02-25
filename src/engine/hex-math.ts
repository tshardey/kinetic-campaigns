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
 * Prefer generateRectGrid for 16:9 map layouts.
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

/** Offset coordinates (col, row) for rectangular layout. Odd rows are shifted right by half a hex (pointy-top odd-r). */
export interface OffsetCoord {
  col: number;
  row: number;
}

/**
 * Convert offset coordinates (col, row) to axial (q, r) for pointy-top hexes with odd-r layout.
 */
export function offsetToAxial(col: number, row: number): AxialCoord {
  const q = col - (row - (row & 1)) / 2;
  const r = row;
  return { q, r };
}

/**
 * Convert axial (q, r) to offset (col, row) for pointy-top hexes with odd-r layout.
 */
export function axialToOffset(q: number, r: number): OffsetCoord {
  const col = q + (r - (r & 1)) / 2;
  const row = r;
  return { col, row };
}

/**
 * Generate a rectangular hex grid (axial coordinates) for a 16:9-style map.
 * Uses odd-r offset: odd rows are shifted right by half a hex.
 * @param cols Number of columns (horizontal)
 * @param rows Number of rows (vertical)
 */
export function generateRectGrid(cols: number, rows: number): HexCell[] {
  const grid: HexCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { q, r } = offsetToAxial(col, row);
      grid.push({ q, r, id: `${q},${r}` });
    }
  }
  return grid;
}

/** Pixel bounds of a rectangular grid with default hex size. */
export interface RectGridBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Get the pixel bounding box of a rectangular grid (for viewBox/transform).
 */
export function getRectGridPixelBounds(
  cols: number,
  rows: number,
  size: number = DEFAULT_HEX_SIZE
): RectGridBounds {
  const grid = generateRectGrid(cols, rows);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const hexHalfWidth = (size * Math.sqrt(3)) / 2;
  const hexHalfHeight = size;
  for (const cell of grid) {
    const { x, y } = hexToPixel(cell.q, cell.r, size);
    minX = Math.min(minX, x - hexHalfWidth);
    minY = Math.min(minY, y - hexHalfHeight);
    maxX = Math.max(maxX, x + hexHalfWidth);
    maxY = Math.max(maxY, y + hexHalfHeight);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

/** Transform to fit rect grid into a 16:9 viewBox (e.g. 0 0 960 540). */
export interface RectGridTransform {
  viewBoxWidth: number;
  viewBoxHeight: number;
  scale: number;
  originX: number;
  originY: number;
}

const DEFAULT_VIEW_WIDTH = 960;
const DEFAULT_VIEW_HEIGHT = 540;

/**
 * Get scale and origin so that the rect grid fits inside a 16:9 viewBox.
 * Pixel position in viewBox: x' = originX + scale * (x - bounds.centerX), y' = originY + scale * (y - bounds.centerY)
 * with viewBox center at (viewBoxWidth/2, viewBoxHeight/2).
 */
export function getRectGridTransform(
  cols: number,
  rows: number,
  size: number = DEFAULT_HEX_SIZE,
  viewWidth: number = DEFAULT_VIEW_WIDTH,
  viewHeight: number = DEFAULT_VIEW_HEIGHT
): RectGridTransform {
  const bounds = getRectGridPixelBounds(cols, rows, size);
  // Use Math.max to ensure the grid completely covers the viewBox.
  // Multiply by 1.08 to cleanly crop the zig-zag outer half-hex edges,
  // making the grid appear flush and straight against the rectangular container.
  const scale = Math.max(viewWidth / bounds.width, viewHeight / bounds.height) * 1.08;
  return {
    viewBoxWidth: viewWidth,
    viewBoxHeight: viewHeight,
    scale,
    originX: viewWidth / 2,
    originY: viewHeight / 2,
  };
}

/**
 * Convert a hex pixel position (from hexToPixel) into viewBox coordinates using the rect grid transform.
 */
export function hexToViewPixel(
  pixelX: number,
  pixelY: number,
  bounds: RectGridBounds,
  transform: RectGridTransform
): { x: number; y: number } {
  const dx = pixelX - bounds.centerX;
  const dy = pixelY - bounds.centerY;
  return {
    x: transform.originX + transform.scale * dx,
    y: transform.originY + transform.scale * dy,
  };
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
