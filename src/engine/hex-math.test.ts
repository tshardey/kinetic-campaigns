import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HEX_SIZE,
  offsetToAxial,
  axialToOffset,
  generateRectGrid,
  getRectGridPixelBounds,
  getRectGridTransform,
  hexToPixel,
  hexToViewPixel,
  generateGrid,
  hexDistance,
  getAdjacentHexIds,
} from './hex-math';

describe('offsetToAxial / axialToOffset', () => {
  it('round-trips offset to axial and back', () => {
    for (const col of [0, 1, 5, 12]) {
      for (const row of [0, 1, 3, 6]) {
        const axial = offsetToAxial(col, row);
        const back = axialToOffset(axial.q, axial.r);
        expect(back.col).toBe(col);
        expect(back.row).toBe(row);
      }
    }
  });

  it('produces correct axial for odd-r layout (row 0)', () => {
    expect(offsetToAxial(0, 0)).toEqual({ q: 0, r: 0 });
    expect(offsetToAxial(1, 0)).toEqual({ q: 1, r: 0 });
    expect(offsetToAxial(2, 0)).toEqual({ q: 2, r: 0 });
  });

  it('produces correct axial for odd row (row 1)', () => {
    // Odd row: q = col - (row - 1)/2 = col - 0
    expect(offsetToAxial(0, 1)).toEqual({ q: 0, r: 1 });
    expect(offsetToAxial(1, 1)).toEqual({ q: 1, r: 1 });
  });
});

describe('generateRectGrid', () => {
  it('returns cols * rows cells', () => {
    expect(generateRectGrid(13, 7)).toHaveLength(13 * 7);
    expect(generateRectGrid(14, 9)).toHaveLength(14 * 9);
  });

  it('uses id format q,r', () => {
    const grid = generateRectGrid(2, 2);
    const ids = grid.map((c) => c.id);
    expect(ids).toContain('0,0');
    expect(ids.every((id) => /^-?\d+,-?\d+$/.test(id))).toBe(true);
  });

  it('has unique ids', () => {
    const grid = generateRectGrid(14, 9);
    const ids = new Set(grid.map((c) => c.id));
    expect(ids.size).toBe(grid.length);
  });
});

describe('getRectGridPixelBounds', () => {
  it('returns positive width and height', () => {
    const b = getRectGridPixelBounds(13, 7);
    expect(b.width).toBeGreaterThan(0);
    expect(b.height).toBeGreaterThan(0);
  });

  it('center is midpoint of min/max', () => {
    const b = getRectGridPixelBounds(14, 9);
    expect(b.centerX).toBeCloseTo((b.minX + b.maxX) / 2);
    expect(b.centerY).toBeCloseTo((b.minY + b.maxY) / 2);
  });

  it('scales with custom hex size', () => {
    const b40 = getRectGridPixelBounds(5, 5, 40);
    const b20 = getRectGridPixelBounds(5, 5, 20);
    expect(b20.width).toBeCloseTo(b40.width / 2);
    expect(b20.height).toBeCloseTo(b40.height / 2);
  });
});

describe('getRectGridTransform', () => {
  it('returns 16:9 viewBox by default', () => {
    const t = getRectGridTransform(14, 9);
    expect(t.viewBoxWidth).toBe(960);
    expect(t.viewBoxHeight).toBe(540);
  });

  it('scale is positive and origin at center', () => {
    const t = getRectGridTransform(14, 9);
    expect(t.scale).toBeGreaterThan(0);
    expect(t.originX).toBe(480);
    expect(t.originY).toBe(270);
  });

  it('scale uses Math.max so grid covers viewBox', () => {
    const t = getRectGridTransform(14, 9);
    const bounds = getRectGridPixelBounds(14, 9);
    const minScaleToFit = Math.min(960 / bounds.width, 540 / bounds.height);
    expect(t.scale).toBeGreaterThanOrEqual(minScaleToFit * 1.0);
  });
});

describe('hexToViewPixel', () => {
  it('maps grid center to viewBox center', () => {
    const cols = 14;
    const rows = 9;
    const bounds = getRectGridPixelBounds(cols, rows);
    const transform = getRectGridTransform(cols, rows);
    const view = hexToViewPixel(bounds.centerX, bounds.centerY, bounds, transform);
    expect(view.x).toBeCloseTo(transform.originX);
    expect(view.y).toBeCloseTo(transform.originY);
  });
});

describe('hexToPixel', () => {
  it('origin at (0,0)', () => {
    const p = hexToPixel(0, 0);
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
  });

  it('scales with size', () => {
    const p1 = hexToPixel(1, 0, 40);
    const p2 = hexToPixel(1, 0, 20);
    expect(p2.x).toBeCloseTo(p1.x / 2);
  });
});

describe('generateGrid (circular)', () => {
  it('radius 0 returns one cell', () => {
    const grid = generateGrid(0);
    expect(grid).toHaveLength(1);
    expect(grid[0].id).toBe('0,0');
    expect(String(grid[0].q)).toBe('0');
    expect(String(grid[0].r)).toBe('0');
  });

  it('radius 1 returns 7 cells', () => {
    expect(generateGrid(1)).toHaveLength(7);
  });
});

describe('hexDistance', () => {
  it('same hex is 0', () => {
    expect(hexDistance({ q: 2, r: -1 }, { q: 2, r: -1 })).toBe(0);
  });

  it('adjacent hexes are 1', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
  });
});

describe('getAdjacentHexIds', () => {
  it('returns 6 ids for interior hex', () => {
    const ids = getAdjacentHexIds(0, 0);
    expect(ids).toHaveLength(6);
    expect(ids).toContain('1,0');
    expect(ids).toContain('0,1');
  });
});
