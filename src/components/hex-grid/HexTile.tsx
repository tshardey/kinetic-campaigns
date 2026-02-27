import type { HexCell } from '@/types/hex';
import type { MapEncounter } from '@/types/campaign';

interface HexTileProps {
  hex: HexCell;
  pixelX: number;
  pixelY: number;
  hexPoints: string;
  /** Scale factor for hex shape (e.g. when using rect grid viewBox transform). Default 1. */
  scale?: number;
  isRevealed: boolean;
  isPlayerHere: boolean;
  encounter: MapEncounter | undefined;
  isCleared: boolean;
  /** True when this hex is a narrative rift entrance (show rift marker when revealed). */
  isRiftHex?: boolean;
  /** True when this hex is the Nexus Tent (starting hex); show tent icon and open Nexus on click. */
  isNexusHex?: boolean;
  onMove: (q: number, r: number, id: string) => void;
  /** When Nexus hex is clicked, open the Nexus Tent UI instead of moving. */
  onOpenNexus?: () => void;
  /** Scout the Multiverse: hex is in next ring (distance 2), not yet revealed; click to reveal. */
  isScoutable?: boolean;
  onScout?: () => void;
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
  scale = 1,
  isRevealed,
  isPlayerHere,
  encounter,
  isCleared,
  isRiftHex = false,
  isNexusHex = false,
  onMove,
  onOpenNexus,
  isScoutable = false,
  onScout,
}: HexTileProps) {
  // Unrevealed: opaque fog of war. Revealed: transparent so underlying map shows through.
  let fill = '#1e293b';
  let fillOpacity = 1;
  let stroke = '#0f172a';
  if (isScoutable) {
    fill = '#1e3a5f';
    fillOpacity = 0.85;
    stroke = 'rgba(56, 189, 248, 0.6)';
  } else if (isRevealed) {
    fillOpacity = 0.35;
    fill = '#334155';
    stroke = 'rgba(71, 85, 105, 0.9)';
    if (isRiftHex && !isCleared) {
      fill = '#4c1d95'; // violet: narrative rift
    } else if (encounter && !isCleared) {
      if (encounter.type === 'basic') fill = '#713f12';
      if (encounter.type === 'elite') fill = '#7f1d1d';
      if (encounter.type === 'boss') fill = '#4c1d95';
      if (encounter.type === 'anomaly') fill = '#0c4a6e';
    } else if (isCleared) {
      fill = '#1e293b';
    }
  }

  const canMove = isRevealed && !isPlayerHere && !isNexusHex;
  const canScout = isScoutable && onScout;
  const canOpenNexus = isNexusHex && isRevealed && onOpenNexus;

  return (
    <g transform={`translate(${pixelX}, ${pixelY}) scale(${scale})`}>
      <polygon
        points={hexPoints}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth="2"
        className={`transition-all duration-300 ${canMove || canScout || canOpenNexus ? 'cursor-pointer hover:opacity-80' : ''}`}
        style={canMove || canScout || canOpenNexus ? { touchAction: 'manipulation' } : undefined}
        pointerEvents="none"
      />
      {/* Larger transparent hit area for touch (min ~44px); receives clicks when clickable */}
      {canScout && (
        <circle
          r="24"
          fill="transparent"
          className="cursor-pointer"
          style={{ touchAction: 'manipulation' }}
          onClick={(e) => {
            e.stopPropagation();
            onScout?.();
          }}
          aria-label={`Scout hex ${hex.id}`}
        />
      )}
      {canOpenNexus && (
        <circle
          r="24"
          fill="transparent"
          className="cursor-pointer"
          style={{ touchAction: 'manipulation' }}
          onClick={(e) => {
            e.stopPropagation();
            onOpenNexus?.();
          }}
          aria-label="Open Nexus Tent"
        />
      )}
      {canMove && !canScout && !canOpenNexus && (
        <circle
          r="24"
          fill="transparent"
          className="cursor-pointer"
          style={{ touchAction: 'manipulation' }}
          onClick={() => onMove(hex.q, hex.r, hex.id)}
          aria-label={`Move to hex ${hex.id}`}
        />
      )}
      {isRevealed && isNexusHex && (
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fill="white"
          fontSize="16"
          pointerEvents="none"
        >
          ⛺
        </text>
      )}
      {isRevealed && isRiftHex && !isCleared && !isNexusHex && (
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fill="white"
          fontSize="16"
          pointerEvents="none"
        >
          🌙
        </text>
      )}
      {isScoutable && (
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fill="rgba(56, 189, 248, 0.9)"
          fontSize="14"
          pointerEvents="none"
        >
          🔭
        </text>
      )}
      {isRevealed && !isRiftHex && !isNexusHex && !isScoutable && encounter && !isCleared && (
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
