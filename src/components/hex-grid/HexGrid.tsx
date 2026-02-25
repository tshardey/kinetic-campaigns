import { useMemo } from 'react';
import type { AxialCoord } from '@/types/hex';
import type { MapEncounter } from '@/types/campaign';
import {
  generateGrid,
  hexToPixel,
  getHexPoints,
  DEFAULT_HEX_SIZE,
} from '@/engine/hex-math';
import { HexTile } from './HexTile';
import { EncounterPanel } from './EncounterPanel';

interface HexGridProps {
  radius: number;
  playerPos: AxialCoord;
  revealedHexes: Set<string>;
  clearedHexes: Set<string>;
  encounters: Record<string, MapEncounter>;
  onMove: (q: number, r: number, id: string) => void;
  onEngageEncounter: (hexId: string, encounter: MapEncounter) => void;
}

export function HexGrid({
  radius,
  playerPos,
  revealedHexes,
  clearedHexes,
  encounters,
  onMove,
  onEngageEncounter,
}: HexGridProps) {
  const grid = useMemo(() => generateGrid(radius), [radius]);
  const hexPoints = useMemo(() => getHexPoints(DEFAULT_HEX_SIZE), []);

  const playerHexId = `${playerPos.q},${playerPos.r}`;
  const currentEncounter = encounters[playerHexId];
  const isCurrentCleared = clearedHexes.has(playerHexId);

  return (
    <div className="absolute inset-0 flex items-center justify-center cursor-move bg-[#0f172a] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <svg
        viewBox="-300 -300 600 600"
        className="w-full h-full max-w-4xl max-h-4xl drop-shadow-2xl"
      >
        <g className="hex-grid">
          {grid.map((hex) => {
            const { x, y } = hexToPixel(hex.q, hex.r, DEFAULT_HEX_SIZE);
            return (
              <HexTile
                key={hex.id}
                hex={hex}
                pixelX={x}
                pixelY={y}
                hexPoints={hexPoints}
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

      {currentEncounter && !isCurrentCleared && (
        <EncounterPanel
          encounter={currentEncounter}
          onEngage={() => onEngageEncounter(playerHexId, currentEncounter)}
        />
      )}
    </div>
  );
}
