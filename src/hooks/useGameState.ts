/**
 * Manages character, resources, progression, map state, and inventory.
 * Reads from and auto-saves to localStorage on every change.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Character, CharacterResources, Progression, InventoryItem, LevelUpChoice } from '@/types/character';
import type { ActivityType } from '@/types/character';
import type { MapEncounter, NexusReward } from '@/types/campaign';
import type { CampaignPackage } from '@/types/campaign';
import type { RiftProgress } from '@/lib/game-state-storage';
import { applyActivity, canAffordMove, spendSlipstream, canAffordEncounter, spendForEncounter } from '@/engine/resources';
import { applyEncounterRewardWithLevelUpFlow, spendCurrency } from '@/engine/progression';
import { getAdjacentHexIds } from '@/engine/hex-math';
import { applyArtifactOnAcquisition, getConsumableEffect, lootDropToInventoryItem } from '@/engine/inventory';
import { canAffordRiftStage, spendForRiftStage } from '@/engine/rift';
import { loadGameState, saveGameState, getDefaultMapState } from '@/lib/game-state-storage';

const DEFAULT_RESOURCES: CharacterResources = { slipstream: 5, strikes: 2, wards: 0, aether: 1 };
const DEFAULT_PROGRESSION: Progression = { xp: 0, level: 1, currency: 120 };

export interface GameStateHookParams {
  cols: number;
  rows: number;
  campaign: CampaignPackage;
  /** When provided, used instead of alert() for user messages. */
  toast?: (message: string, type?: 'info' | 'error') => void;
}

export interface GameStateHookResult {
  character: Character | null;
  setCharacter: (character: Character | null) => void;
  resources: CharacterResources;
  setResources: React.Dispatch<React.SetStateAction<CharacterResources>>;
  progression: Progression;
  setProgression: React.Dispatch<React.SetStateAction<Progression>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  playerPos: { q: number; r: number };
  setPlayerPos: React.Dispatch<React.SetStateAction<{ q: number; r: number }>>;
  revealedHexes: Set<string>;
  setRevealedHexes: React.Dispatch<React.SetStateAction<Set<string>>>;
  clearedHexes: Set<string>;
  setClearedHexes: React.Dispatch<React.SetStateAction<Set<string>>>;
  justClearedHexId: string | null;
  setJustClearedHexId: React.Dispatch<React.SetStateAction<string | null>>;
  riftProgress: RiftProgress;
  setRiftProgress: React.Dispatch<React.SetStateAction<RiftProgress>>;
  logWorkout: (type: ActivityType, durationMinutes?: number) => void;
  movePlayer: (q: number, r: number, id: string) => void;
  engageEncounter: (hexId: string, encounter: MapEncounter) => void;
  attemptRiftStage: (hexId: string, riftId: string, stageIndex: number) => boolean;
  useConsumable: (item: InventoryItem, choice?: 'haste' | 'flow') => void;
  purchaseReward: (reward: NexusReward) => void;
  /** Level-up flow: true when XP at cap and user must choose reward. */
  pendingLevelUp: boolean;
  /** Progression to apply after level-up choice. */
  pendingProgressionAfterLevelUp: Progression | null;
  completeLevelUp: (choice: import('@/types/character').LevelUpChoice) => void;
}

/**
 * Manages full game state with localStorage persistence.
 * When character is first set (e.g. after creation), map state is initialized to default.
 */
export function useGameState({ cols, rows, campaign, toast }: GameStateHookParams): GameStateHookResult {
  const notify = toast ?? ((msg: string) => { alert(msg); });
  const [character, setCharacterState] = useState<Character | null>(() => {
    const loaded = loadGameState(cols, rows);
    return loaded?.character ?? null;
  });

  const defaultMap = getDefaultMapState(cols, rows);
  const [resources, setResources] = useState<CharacterResources>(() => {
    const loaded = loadGameState(cols, rows);
    return loaded?.character?.resources ?? DEFAULT_RESOURCES;
  });
  const [progression, setProgression] = useState<Progression>(() => {
    const loaded = loadGameState(cols, rows);
    return loaded?.character?.progression ?? DEFAULT_PROGRESSION;
  });
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const loaded = loadGameState(cols, rows);
    return loaded?.character?.inventory ?? [];
  });
  const [playerPos, setPlayerPos] = useState<{ q: number; r: number }>(() => {
    const loaded = loadGameState(cols, rows);
    return loaded?.mapState?.playerPos ?? defaultMap.playerPos;
  });
  const [revealedHexes, setRevealedHexes] = useState<Set<string>>(() => {
    const loaded = loadGameState(cols, rows);
    return loaded?.mapState ? new Set(loaded.mapState.revealedHexes) : new Set(defaultMap.revealedHexes);
  });
  const [clearedHexes, setClearedHexes] = useState<Set<string>>(() => {
    const loaded = loadGameState(cols, rows);
    return loaded?.mapState ? new Set(loaded.mapState.clearedHexes) : new Set(defaultMap.clearedHexes);
  });
  const [justClearedHexId, setJustClearedHexId] = useState<string | null>(null);
  const [riftProgress, setRiftProgress] = useState<RiftProgress>(() => {
    const loaded = loadGameState(cols, rows);
    return loaded?.mapState?.riftProgress ?? {};
  });
  const [pendingLevelUp, setPendingLevelUp] = useState<boolean>(() => {
    const loaded = loadGameState(cols, rows);
    return (loaded as { pendingLevelUp?: boolean } | null)?.pendingLevelUp ?? false;
  });
  const [pendingProgressionAfterLevelUp, setPendingProgressionAfterLevelUp] = useState<Progression | null>(() => {
    const loaded = loadGameState(cols, rows) as { pendingProgressionAfterLevelUp?: Progression } | null;
    return loaded?.pendingProgressionAfterLevelUp ?? null;
  });

  const setCharacter = useCallback(
    (next: Character | null) => {
      setCharacterState((prev) => {
        if (next && !prev) {
          // First time character set (e.g. after creation): init map state to default
          const def = getDefaultMapState(cols, rows);
          setPlayerPos(def.playerPos);
          setRevealedHexes(new Set(def.revealedHexes));
          setClearedHexes(new Set(def.clearedHexes));
          setRiftProgress(def.riftProgress ?? {});
          setResources(next.resources);
          setProgression(next.progression);
          setInventory(next.inventory ?? []);
        }
        return next;
      });
    },
    [cols, rows]
  );

  const logWorkout = useCallback((type: ActivityType, durationMinutes?: number) => {
    setResources((prev) => applyActivity(prev, type, durationMinutes));
  }, []);

  const movePlayer = useCallback(
    (q: number, r: number, id: string) => {
      if (!canAffordMove(resources)) {
        notify('Not enough Slipstream Tokens! Log some Cardio.', 'error');
        return;
      }
      const dq = Math.abs(playerPos.q - q);
      const dr = Math.abs(playerPos.r - r);
      const ds = Math.abs(-playerPos.q - playerPos.r - (-q - r));
      const distance = Math.max(dq, dr, ds);
      if (distance !== 1) return;
      const nextResources = spendSlipstream(resources);
      if (!nextResources) return;
      setResources(nextResources);
      setRevealedHexes((rev) => {
        const next = new Set(rev);
        next.add(id);
        getAdjacentHexIds(q, r).forEach((adjId) => next.add(adjId));
        return next;
      });
      setPlayerPos({ q, r });
    },
    [resources, playerPos, notify]
  );

  const engageEncounter = useCallback(
    (hexId: string, encounter: MapEncounter) => {
      const costShape =
        encounter.type === 'anomaly'
          ? { type: 'anomaly' as const, cost: encounter.cost, resource: encounter.resource, resource_amount: encounter.resource_amount }
          : { type: encounter.type, strikes: encounter.strikes };
      if (!canAffordEncounter(resources, costShape)) {
        if (encounter.type === 'anomaly') {
          const resourceLabel = encounter.resource === 'strikes' ? 'Strike(s)' : encounter.resource === 'wards' ? 'Ward(s)' : 'Slipstream';
          notify(`Need ${encounter.resource_amount} ${resourceLabel} and ${encounter.cost} Aether to resolve this anomaly.`, 'error');
        } else {
          notify(`Need ${encounter.strikes} Strikes to defeat ${encounter.name}. Log more Strength!`, 'error');
        }
        return;
      }
      const nextResources = spendForEncounter(resources, costShape);
      if (!nextResources) return;
      setResources(nextResources);
      const xpGain = encounter.type === 'elite' ? 1 : encounter.type === 'boss' ? 3 : 0;
      setClearedHexes((prev) => new Set(prev).add(hexId));
      setProgression((prev) => {
        const result = applyEncounterRewardWithLevelUpFlow(prev, encounter.gold, xpGain);
        if (result.leveledUp && result.nextProgressionAfterLevelUp) {
          setPendingLevelUp(true);
          setPendingProgressionAfterLevelUp(result.nextProgressionAfterLevelUp);
          return result.progression;
        }
        return result.progression;
      });

      if (encounter.type !== 'anomaly' && encounter.id) {
        const fullEncounter = campaign.encounters.find(
          (e) => e.id === encounter.id || (e.name === encounter.name && e.type === encounter.type)
        );
        if (fullEncounter?.loot_drop) {
          const item = lootDropToInventoryItem(fullEncounter.loot_drop);
          setInventory((prev) => [...prev, item]);
          if (item.kind === 'artifact') {
            setCharacterState((prev) => {
              if (!prev) return null;
              const newStats = applyArtifactOnAcquisition(item.id, prev.stats);
              return newStats ? { ...prev, stats: newStats } : prev;
            });
          }
        }
      }
      setJustClearedHexId(hexId);
    },
    [resources, campaign.encounters, notify]
  );

  const useConsumable = useCallback((item: InventoryItem, choice?: 'haste' | 'flow') => {
    if (item.kind !== 'consumable') return;
    const effect = getConsumableEffect(item.id, choice);
    if (!effect) return;
    setInventory((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
    if (effect.addStrikes) {
      setResources((r) => ({ ...r, strikes: r.strikes + effect.addStrikes! }));
    }
    if (effect.addSlipstream) {
      setResources((r) => ({ ...r, slipstream: r.slipstream + effect.addSlipstream! }));
    }
    if (effect.statDelta) {
      setCharacterState((prev) => {
        if (!prev) return null;
        const newStats = { ...prev.stats };
        if (effect.statDelta!.haste) newStats.haste += effect.statDelta!.haste;
        if (effect.statDelta!.flow) newStats.flow += effect.statDelta!.flow;
        if (effect.statDelta!.brawn) newStats.brawn += effect.statDelta!.brawn;
        if (effect.statDelta!.focus) newStats.focus += effect.statDelta!.focus;
        return { ...prev, stats: newStats };
      });
    }
    if (effect.parasolShieldActive !== undefined) {
      setCharacterState((prev) => (prev ? { ...prev, parasolShieldActive: effect.parasolShieldActive } : null));
    }
  }, []);

  const purchaseReward = useCallback((reward: NexusReward) => {
    setProgression((prev) => {
      const next = spendCurrency(prev, reward.cost);
      if (!next) return prev;
      notify(`Purchased ${reward.title}! Go treat yourself.`, 'info');
      return next;
    });
  }, [notify]);

  const completeLevelUp = useCallback((choice: LevelUpChoice) => {
    setPendingProgressionAfterLevelUp((nextProg) => {
      if (!nextProg) return null;
      setCharacterState((prev) => {
        if (!prev) return null;
        if (choice.type === 'new_move' || choice.type === 'cross_class_move') {
          return {
            ...prev,
            learnedMoveIds: [...(prev.learnedMoveIds ?? []), choice.moveId],
          };
        }
        return {
          ...prev,
          stats: {
            ...prev.stats,
            [choice.stat]: prev.stats[choice.stat] + 1,
          },
        };
      });
      setProgression(nextProg);
      setPendingLevelUp(false);
      return null;
    });
  }, []);

  const attemptRiftStage = useCallback(
    (hexId: string, riftId: string, stageIndex: number): boolean => {
      const rift = campaign.rifts?.find((r) => r.id === riftId);
      if (!rift || !character || stageIndex < 0 || stageIndex >= rift.stages.length) return false;
      const stage = rift.stages[stageIndex];
      if (!canAffordRiftStage(resources, character.stats, stage)) return false;
      const nextResources = spendForRiftStage(resources, stage);
      if (nextResources === null) return false;
      setResources(nextResources);
      setRiftProgress((prev) => ({ ...prev, [riftId]: stageIndex + 1 }));
      if (stageIndex + 1 === rift.stages.length) {
        setClearedHexes((prev) => new Set(prev).add(hexId));
        setJustClearedHexId(hexId);
        if (rift.completion_xp != null && rift.completion_xp > 0) {
          setProgression((prev) => {
            const result = applyEncounterRewardWithLevelUpFlow(prev, 0, rift.completion_xp!);
            if (result.leveledUp && result.nextProgressionAfterLevelUp) {
              setPendingLevelUp(true);
              setPendingProgressionAfterLevelUp(result.nextProgressionAfterLevelUp);
              return result.progression;
            }
            return result.progression;
          });
        }
        if (rift.completion_loot) {
          const item = lootDropToInventoryItem(rift.completion_loot);
          setInventory((prev) => [...prev, item]);
          if (item.kind === 'artifact') {
            const artifactItemId = item.id;
            setCharacterState((prev) => {
              if (!prev) return null;
              const newStats = applyArtifactOnAcquisition(artifactItemId, prev.stats);
              return newStats ? { ...prev, stats: newStats } : prev;
            });
          }
        }
      }
      return true;
    },
    [campaign.rifts, character, resources]
  );

  // Persist to localStorage whenever game state changes (character non-null)
  useEffect(() => {
    if (!character) return;
    saveGameState({
      character: {
        ...character,
        resources,
        progression,
        inventory,
      },
      mapState: {
        playerPos,
        revealedHexes: Array.from(revealedHexes),
        clearedHexes: Array.from(clearedHexes),
        riftProgress,
      },
      pendingLevelUp: pendingLevelUp || undefined,
      pendingProgressionAfterLevelUp: pendingProgressionAfterLevelUp ?? undefined,
    });
  }, [character, resources, progression, inventory, playerPos, revealedHexes, clearedHexes, riftProgress, pendingLevelUp, pendingProgressionAfterLevelUp]);

  return {
    character,
    setCharacter,
    resources,
    setResources,
    progression,
    setProgression,
    inventory,
    setInventory,
    playerPos,
    setPlayerPos,
    revealedHexes,
    setRevealedHexes,
    clearedHexes,
    setClearedHexes,
    justClearedHexId,
    setJustClearedHexId,
    riftProgress,
    setRiftProgress,
    logWorkout,
    movePlayer,
    engageEncounter,
    attemptRiftStage,
    useConsumable,
    purchaseReward,
    pendingLevelUp,
    pendingProgressionAfterLevelUp,
    completeLevelUp,
  };
}
