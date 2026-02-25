import type { HexCell } from '@/types/hex';
import type { MapEncounter } from '@/types/campaign';

interface HexTileProps {
  hex: HexCell;
  pixelX: number;
  pixelY: number;
  hexPoints: string;
  isRevealed: boolean;
  isPlayerHere: boolean;
  encounter: MapEncounter | undefined;
  isCleared: boolean;
  onMove: (q: number, r: number, id: string) => void;
}

function getEncounterEmoji(encounter: MapEncounter): string {
  if (encounter.type === 'basic') return '⚔️';
  if (encounter.type === 'boss') return '💀';
  if (encounter.type === 'anomaly') return '🔮';
  return '👹'; // elite
}

export function HexTile({
  hex,
  pixelX,
  pixelY,
  hexPoints,
  isRevealed,
  isPlayerHere,
  encounter,
  isCleared,
  onMove,
}: HexTileProps) {
  let fill = '#1e293b';
  let stroke = '#0f172a';
  if (isRevealed) {
    fill = '#334155';
    stroke = '#475569';
    if (encounter && !isCleared) {
      if (encounter.type === 'basic') fill = '#713f12';
      if (encounter.type === 'elite') fill = '#7f1d1d';
      if (encounter.type === 'boss') fill = '#4c1d95';
      if (encounter.type === 'anomaly') fill = '#0c4a6e';
    } else if (isCleared) {
      fill = '#1e293b';
    }
  }

  const canClick = isRevealed && !isPlayerHere;

  return (
    <g transform={`translate(${pixelX}, ${pixelY})`}>
      <polygon
        points={hexPoints}
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
        className={`transition-all duration-300 ${canClick ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={() => canClick && onMove(hex.q, hex.r, hex.id)}
      />
      {isRevealed && encounter && !isCleared && (
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fill="white"
          fontSize="16"
          pointerEvents="none"
        >
          {getEncounterEmoji(encounter)}
        </text>
      )}
      {isPlayerHere && (
        <circle cx="0" cy="0" r="12" fill="#2dd4bf" className="animate-pulse" />
      )}
    </g>
  );
}
