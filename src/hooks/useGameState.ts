/**
 * Manages character, resources, progression, map state, and inventory.
 * Reads from and auto-saves to localStorage on every change.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Character, CharacterResources, Progression, InventoryItem } from '@/types/character';
import type { ActivityType } from '@/types/character';
import type { MapEncounter, NexusReward } from '@/types/campaign';
import type { CampaignPackage } from '@/types/campaign';
import { applyActivity, canAffordMove, spendSlipstream, canAffordEncounter, spendForEncounter } from '@/engine/resources';
import { applyEncounterReward, spendCurrency } from '@/engine/progression';
import { getAdjacentHexIds } from '@/engine/hex-math';
import { applyArtifactOnAcquisition, getConsumableEffect, lootDropToInventoryItem } from '@/engine/inventory';
import { loadGameState, saveGameState, getDefaultMapState } from '@/lib/game-state-storage';

const DEFAULT_RESOURCES: CharacterResources = { slipstream: 5, strikes: 2, wards: 0, aether: 1 };
const DEFAULT_PROGRESSION: Progression = { xp: 0, level: 1, currency: 120 };

export interface GameStateHookParams {
  cols: number;
  rows: number;
  campaign: CampaignPackage;
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
  logWorkout: (type: ActivityType) => void;
  movePlayer: (q: number, r: number, id: string) => void;
  engageEncounter: (hexId: string, encounter: MapEncounter) => void;
  useConsumable: (item: InventoryItem, choice?: 'haste' | 'flow') => void;
  purchaseReward: (reward: NexusReward) => void;
}

/**
 * Manages full game state with localStorage persistence.
 * When character is first set (e.g. after creation), map state is initialized to default.
 */
export function useGameState({ cols, rows, campaign }: GameStateHookParams): GameStateHookResult {
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

  const setCharacter = useCallback(
    (next: Character | null) => {
      setCharacterState((prev) => {
        if (next && !prev) {
          // First time character set (e.g. after creation): init map state to default
          const def = getDefaultMapState(cols, rows);
          setPlayerPos(def.playerPos);
          setRevealedHexes(new Set(def.revealedHexes));
          setClearedHexes(new Set(def.clearedHexes));
          setResources(next.resources);
          setProgression(next.progression);
          setInventory(next.inventory ?? []);
        }
        return next;
      });
    },
    [cols, rows]
  );

  const logWorkout = useCallback((type: ActivityType) => {
    setResources((prev) => applyActivity(prev, type));
  }, []);

  const movePlayer = useCallback(
    (q: number, r: number, id: string) => {
      setPlayerPos((pos) => {
        const dq = Math.abs(pos.q - q);
        const dr = Math.abs(pos.r - r);
        const ds = Math.abs(-pos.q - pos.r - (-q - r));
        const distance = Math.max(dq, dr, ds);
        if (distance !== 1) return pos;
        if (!canAffordMove(resources)) {
          alert('Not enough Slipstream Tokens! Log some Cardio.');
          return pos;
        }
        const nextResources = spendSlipstream(resources);
        if (!nextResources) return pos;
        setResources(nextResources);
        setRevealedHexes((rev) => {
          const next = new Set(rev);
          next.add(id);
          getAdjacentHexIds(q, r).forEach((adjId) => next.add(adjId));
          return next;
        });
        return { q, r };
      });
    },
    [resources]
  );

  const engageEncounter = useCallback(
    (hexId: string, encounter: MapEncounter) => {
      const costShape =
        encounter.type === 'anomaly'
          ? { type: 'anomaly' as const, cost: encounter.cost }
          : { type: encounter.type, strikes: encounter.strikes };
      if (!canAffordEncounter(resources, costShape)) {
        if (encounter.type === 'anomaly') {
          alert(`Need ${encounter.cost} Aether to clear this anomaly.`);
        } else {
          alert(`Need ${encounter.strikes} Strikes to defeat ${encounter.name}. Log more Strength!`);
        }
        return;
      }
      const nextResources = spendForEncounter(resources, costShape);
      if (!nextResources) return;
      setResources(nextResources);
      const xpGain = encounter.type === 'elite' ? 1 : encounter.type === 'boss' ? 3 : 0;
      setClearedHexes((prev) => new Set(prev).add(hexId));
      setProgression((prev) => applyEncounterReward(prev, encounter.gold, xpGain));

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
    [resources, campaign.encounters]
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
      alert(`Purchased ${reward.title}! Go treat yourself.`);
      return next;
    });
  }, []);

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
      },
    });
  }, [character, resources, progression, inventory, playerPos, revealedHexes, clearedHexes]);

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
    logWorkout,
    movePlayer,
    engageEncounter,
    useConsumable,
    purchaseReward,
  };
}
