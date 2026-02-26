import { useMemo, useState } from 'react';
import type { AxialCoord } from '@/types/hex';
import type { MapEncounter, CampaignPackage } from '@/types/campaign';
import {
  generateRectGrid,
  hexToPixel,
  getHexPoints,
  getRectGridPixelBounds,
  getRectGridTransform,
  hexToViewPixel,
  DEFAULT_HEX_SIZE,
} from '@/engine/hex-math';
import { HexTile } from './HexTile';
import { EncounterPanel } from './EncounterPanel';

interface HexGridProps {
  /** Number of columns (rectangular grid). Use with rows for 16:9 map. */
  cols: number;
  /** Number of rows (rectangular grid). */
  rows: number;
  /** Optional map background image URL (e.g. 16:9 map-background.png). */
  mapBackgroundUrl?: string;
  playerPos: AxialCoord;
  revealedHexes: Set<string>;
  clearedHexes: Set<string>;
  /** When set, the panel for this hex shows victory state until onContinueFromVictory is called. */
  justClearedHexId: string | null;
  encounters: Record<string, MapEncounter>;
  campaign: CampaignPackage | null;
  lootFrameUrl: string;
  onMove: (q: number, r: number, id: string) => void;
  onEngageEncounter: (hexId: string, encounter: MapEncounter) => void;
  onContinueFromVictory: () => void;
}

export function HexGrid({
  cols,
  rows,
  mapBackgroundUrl,
  playerPos,
  revealedHexes,
  clearedHexes,
  justClearedHexId,
  encounters,
  campaign,
  lootFrameUrl,
  onMove,
  onEngageEncounter,
  onContinueFromVictory,
}: HexGridProps) {
  const grid = useMemo(() => generateRectGrid(cols, rows), [cols, rows]);
  const hexPoints = useMemo(() => getHexPoints(DEFAULT_HEX_SIZE), []);
  const bounds = useMemo(
    () => getRectGridPixelBounds(cols, rows, DEFAULT_HEX_SIZE),
    [cols, rows]
  );
  const transform = useMemo(
    () => getRectGridTransform(cols, rows, DEFAULT_HEX_SIZE),
    [cols, rows]
  );

  const playerHexId = `${playerPos.q},${playerPos.r}`;
  const currentEncounter = encounters[playerHexId];
  const isCurrentCleared = clearedHexes.has(playerHexId);
  const showVictory = isCurrentCleared && playerHexId === justClearedHexId;
  const showPanel = currentEncounter && (!isCurrentCleared || showVictory);

  const viewBox = `0 0 ${transform.viewBoxWidth} ${transform.viewBoxHeight}`;
  const [bgImageError, setBgImageError] = useState(false);

  return (
    <div className="absolute inset-0 flex items-center justify-center cursor-move bg-[#0f172a] bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      {/* Strict 16:9 at all viewport sizes so grid and image stay aligned when scrunched */}
        <div className="relative w-full max-w-4xl aspect-video">
        {mapBackgroundUrl && !bgImageError && (
          <img
            src={mapBackgroundUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
            onError={() => setBgImageError(true)}
          />
        )}
        <svg
          viewBox={viewBox}
          className="absolute inset-0 w-full h-full drop-shadow-2xl"
          preserveAspectRatio="xMidYMid meet"
        >
          <g className="hex-grid">
          {grid.map((hex) => {
            const { x, y } = hexToPixel(hex.q, hex.r, DEFAULT_HEX_SIZE);
            const { x: vx, y: vy } = hexToViewPixel(x, y, bounds, transform);
            return (
              <HexTile
                key={hex.id}
                hex={hex}
                pixelX={vx}
                pixelY={vy}
                hexPoints={hexPoints}
                scale={transform.scale}
                isRevealed={revealedHexes.has(hex.id)}
                isPlayerHere={playerPos.q === hex.q && playerPos.r === hex.r}
                encounter={encounters[hex.id]}
                isCleared={clearedHexes.has(hex.id)}
                onMove={onMove}
              />
            );
          })}
          </g>
        </svg>
      </div>

      {showPanel && currentEncounter && (
        <EncounterPanel
          encounter={currentEncounter}
          campaign={campaign}
          lootFrameUrl={lootFrameUrl}
          isVictory={showVictory}
          onEngage={() => onEngageEncounter(playerHexId, currentEncounter)}
          onContinue={onContinueFromVictory}
        />
      )}
    </div>
  );
}
