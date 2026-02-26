import { useMemo, useState, useEffect } from 'react';
import type { AxialCoord } from '@/types/hex';
import type { MapEncounter, CampaignPackage } from '@/types/campaign';
import type { Character, CharacterResources } from '@/types/character';
import type { RiftProgress } from '@/lib/game-state-storage';
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
import { NarrativeRiftPanel } from '@/components/rift/NarrativeRift';

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
  /** Hex id -> rift id for narrative rift entrance hexes. */
  placedRifts: Record<string, string>;
  riftProgress: RiftProgress;
  campaign: CampaignPackage | null;
  character: Character | null;
  lootFrameUrl: string;
  resources?: CharacterResources;
  onMove: (q: number, r: number, id: string) => void;
  onEngageEncounter: (hexId: string, encounter: MapEncounter) => void;
  onAttemptRiftStage: (hexId: string, riftId: string, stageIndex: number) => boolean;
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
  placedRifts,
  riftProgress,
  campaign,
  character,
  lootFrameUrl,
  resources,
  onMove,
  onEngageEncounter,
  onAttemptRiftStage,
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
  const riftId = placedRifts[playerHexId];
  const currentEncounter = riftId ? undefined : encounters[playerHexId];
  const isRiftHex = Boolean(riftId);
  const isCurrentCleared = clearedHexes.has(playerHexId);
  const showVictory = isCurrentCleared && playerHexId === justClearedHexId;
  const rift = riftId && campaign?.rifts ? campaign.rifts.find((r) => r.id === riftId) : null;
  const completedRiftStages = riftId ? (riftProgress[riftId] ?? 0) : 0;
  const [dismissedRiftHexId, setDismissedRiftHexId] = useState<string | null>(null);
  useEffect(() => {
    setDismissedRiftHexId(null);
  }, [playerHexId]);
  const showRiftPanel =
    isRiftHex &&
    character &&
    rift &&
    (!isCurrentCleared || showVictory) &&
    dismissedRiftHexId !== playerHexId;
  const showEncounterPanel = !showRiftPanel && currentEncounter && (!isCurrentCleared || showVictory);

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
                isRiftHex={hex.id in placedRifts}
                onMove={onMove}
              />
            );
          })}
          </g>
        </svg>
      </div>

      {showRiftPanel && rift && character && resources !== undefined && (
        <NarrativeRiftPanel
          rift={rift}
          character={character}
          resources={resources}
          completedStages={completedRiftStages}
          isJustCompleted={showVictory}
          lootFrameUrl={lootFrameUrl}
          onAttemptStage={(stageIndex) => onAttemptRiftStage(playerHexId, rift.id, stageIndex)}
          onContinue={onContinueFromVictory}
          onLeave={() => setDismissedRiftHexId(playerHexId)}
        />
      )}
      {showEncounterPanel && currentEncounter && (
        <EncounterPanel
          encounter={currentEncounter}
          campaign={campaign}
          lootFrameUrl={lootFrameUrl}
          isVictory={showVictory}
          resources={resources}
          onEngage={() => onEngageEncounter(playerHexId, currentEncounter)}
          onContinue={onContinueFromVictory}
        />
      )}
    </div>
  );
}
