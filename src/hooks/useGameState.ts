/**
 * Manages character, resources, progression, map state, and inventory.
 * Reads from and auto-saves to localStorage on every change.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Character, CharacterResources, Progression, InventoryItem, LevelUpChoice } from '@/types/character';
import type { ActivityType } from '@/types/character';
import type { MapEncounter, NexusReward } from '@/types/campaign';
import type { CampaignPackage } from '@/types/campaign';
import type { RiftProgress, CampaignStatus } from '@/lib/game-state-storage';
import { applyActivity, canAffordMove, spendSlipstream, canAffordEncounter, spendForEncounter, spendStrikes, spendWards, spendAether } from '@/engine/resources';
import { applyEncounterRewardWithLevelUpFlow, spendCurrency, addCurrency } from '@/engine/progression';
import { getAdjacentHexIds, getHexIdsAtDistance } from '@/engine/hex-math';
import { getDefaultStartHexId } from '@/engine/encounter-placement';
import { applyArtifactOnAcquisition, getConsumableEffect, lootDropToInventoryItem } from '@/engine/inventory';
import { canAffordRiftStage, spendForRiftStage } from '@/engine/rift';
import { loadGameState, saveGameState, getDefaultMapState } from '@/lib/game-state-storage';

const DEFAULT_RESOURCES: CharacterResources = { slipstream: 5, strikes: 2, wards: 0, aether: 1 };
const DEFAULT_PROGRESSION: Progression = { xp: 0, level: 1, currency: 0 };

export interface GameStateHookParams {
  cols: number;
  rows: number;
  campaign: CampaignPackage;
  /** Placed encounters (hexId -> encounter) for boss gate: requires all elites defeated and rifts closed. */
  placedEncounters?: Record<string, MapEncounter>;
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
  encounterHealth: Record<string, number>;
  setEncounterHealth: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  /** Per-encounter: whether Dimensional Anchor was used (hexId -> true). */
  anchorUses: Record<string, boolean>;
  setAnchorUses: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  justClearedHexId: string | null;
  setJustClearedHexId: React.Dispatch<React.SetStateAction<string | null>>;
  riftProgress: RiftProgress;
  setRiftProgress: React.Dispatch<React.SetStateAction<RiftProgress>>;
  campaignStatus: CampaignStatus;
  logWorkout: (type: ActivityType, durationMinutes?: number) => void;
  movePlayer: (q: number, r: number, id: string) => void;
  engageEncounter: (hexId: string, encounter: MapEncounter, options?: { phaseStrike?: boolean }) => void;
  /** Spend 2 Aether to reduce Elite/Boss required strikes by 1 (once per encounter). Returns true if used. */
  useDimensionalAnchor: (hexId: string) => boolean;
  /** Spend 2 Aether to restore 3 HP (Nexus Synthesizer move). Returns true if used. */
  nexusSynthesizerHeal: () => boolean;
  /** Spend 1 Aether to reveal a hex in the next ring (2 steps away) without moving (Scout the Multiverse). Returns true if revealed. */
  onScoutHex: (hexId: string) => boolean;
  attemptRiftStage: (hexId: string, riftId: string, stageIndex: number) => boolean;
  useConsumable: (item: InventoryItem) => void;
  /** Spend 1 Aether per 1 HP restored (capped at maxHp). Returns true if any healing applied. */
  heal: (amount: number) => boolean;
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
export function useGameState({ cols, rows, campaign, placedEncounters = {}, toast }: GameStateHookParams): GameStateHookResult {
  const notify = toast ?? ((msg: string) => { alert(msg); });
  const [character, setCharacterState] = useState<Character | null>(() => {
    const loaded = loadGameState(cols, rows);
    return loaded?.character ?? null;
  });

  const defaultMap = getDefaultMapState(cols, rows, campaign.realm.startingHex);
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
  const [encounterHealth, setEncounterHealth] = useState<Record<string, number>>(() => {
    const loaded = loadGameState(cols, rows);
    return loaded?.mapState?.encounterHealth ?? defaultMap.encounterHealth ?? {};
  });
  const [anchorUses, setAnchorUses] = useState<Record<string, boolean>>(() => {
    const loaded = loadGameState(cols, rows);
    return loaded?.mapState?.anchorUses ?? defaultMap.anchorUses ?? {};
  });
  const [justClearedHexId, setJustClearedHexId] = useState<string | null>(null);
  const [riftProgress, setRiftProgress] = useState<RiftProgress>(() => {
    const loaded = loadGameState(cols, rows);
    return loaded?.mapState?.riftProgress ?? {};
  });
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>(() => {
    const loaded = loadGameState(cols, rows);
    return (loaded?.mapState as { campaignStatus?: CampaignStatus } | undefined)?.campaignStatus ?? 'active';
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
          const def = getDefaultMapState(cols, rows, campaign.realm.startingHex);
          setPlayerPos(def.playerPos);
          setRevealedHexes(new Set(def.revealedHexes));
          setClearedHexes(new Set(def.clearedHexes));
          setEncounterHealth(def.encounterHealth ?? {});
          setAnchorUses(def.anchorUses ?? {});
          setRiftProgress(def.riftProgress ?? {});
          setCampaignStatus(def.campaignStatus ?? 'active');
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
    setResources((prev) =>
      applyActivity(prev, type, durationMinutes, character ? { stats: character.stats, startingMoveId: character.startingMoveId } : undefined)
    );
  }, [character]);

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
      // Slipstream Surge (Wayfinder): moving to cleared/empty hex, 30% chance to restore 1 HP
      if (
        character?.startingMoveId === 'slipstream-surge' &&
        (clearedHexes.has(id) || !placedEncounters[id]) &&
        Math.random() < 0.3
      ) {
        setCharacterState((prev) => {
          if (!prev) return null;
          const maxHp = prev.maxHp ?? 5;
          const currentHp = prev.hp ?? maxHp;
          if (currentHp >= maxHp) return prev;
          return { ...prev, hp: currentHp + 1 };
        });
      }
    },
    [resources, playerPos, notify, character?.startingMoveId, clearedHexes, placedEncounters]
  );

  const engageEncounter = useCallback(
    (hexId: string, encounter: MapEncounter, options?: { phaseStrike?: boolean }) => {
      // Anomalies: resolve in one shot (existing cost + clear)
      if (encounter.type === 'anomaly') {
        const costShape = {
          type: 'anomaly' as const,
          cost: encounter.cost,
          resource: encounter.resource,
          resource_amount: encounter.resource_amount,
        };
        if (!canAffordEncounter(resources, costShape)) {
          const resourceLabel = encounter.resource === 'strikes' ? 'Strike(s)' : encounter.resource === 'wards' ? 'Ward(s)' : 'Slipstream';
          notify(`Need ${encounter.resource_amount} ${resourceLabel} and ${encounter.cost} Aether to resolve this anomaly.`, 'error');
          return;
        }
        const nextResources = spendForEncounter(resources, costShape);
        if (!nextResources) return;
        setResources(nextResources);
        setClearedHexes((prev) => new Set(prev).add(hexId));
        setProgression((prev) => addCurrency(prev, encounter.gold));
        setJustClearedHexId(hexId);
        return;
      }

      // Boss gate: require all elites defeated and all rifts fully closed
      if (encounter.type === 'boss') {
        const eliteEntries = Object.entries(placedEncounters).filter(([, e]) => e.type === 'elite');
        const totalElites = eliteEntries.length;
        const defeatedElites = eliteEntries.filter(([hexId]) => clearedHexes.has(hexId)).length;
        const riftsFullyClosed =
          (campaign.rifts?.length ?? 0) > 0 &&
          campaign.rifts!.every((r) => (riftProgress[r.id] ?? 0) >= r.stages.length);
        if (defeatedElites < totalElites || !riftsFullyClosed) {
          notify(
            'You must defeat all Elite encounters and fully close the Narrative Rift before facing the Realm Boss.',
            'error'
          );
          return;
        }
      }

      // Combat: spend up to min(available Strikes, enemy remaining HP) per turn; then one retaliation if enemy survives
      if (!character) return;

      const enemyStrikes = encounter.strikes ?? 1;
      const currentEnemyHp = encounterHealth[hexId] ?? enemyStrikes;

      // Phase Strike (Wayfinder): spend 3 Slipstream, deal 1 damage, no retaliation
      if (options?.phaseStrike) {
        if (character.startingMoveId !== 'phase-strike') {
          notify('Phase Strike is a Wayfinder move.', 'error');
          return;
        }
        if (resources.slipstream < 3) {
          notify('Need 3 Slipstream for Phase Strike. Log more Cardio!', 'error');
          return;
        }
        const afterSlipstream = spendSlipstream(resources, 3);
        if (!afterSlipstream) return;
        setResources(afterSlipstream);
        const newEnemyHp = currentEnemyHp - 1;
        setEncounterHealth((prev) => {
          const next = { ...prev };
          if (newEnemyHp <= 0) delete next[hexId];
          else next[hexId] = newEnemyHp;
          return next;
        });
        if (newEnemyHp <= 0) {
          const fullEncounter = campaign.encounters.find(
            (e) => e.id === encounter.id || (e.name === encounter.name && e.type === encounter.type)
          );
          const xpGain = fullEncounter?.xp ?? (encounter.type === 'basic' ? 1 : encounter.type === 'elite' ? 2 : 4);
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
          if (encounter.type === 'boss') setCampaignStatus('victory');
          if (encounter.id && fullEncounter?.loot_drop) {
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
          const startingMoveId: string = character.startingMoveId;
          if (startingMoveId === 'aura-of-conquest') {
            setResources((r) => ({ ...r, wards: r.wards + 1 }));
          }
          setAnchorUses((prev) => {
            const next = { ...prev };
            delete next[hexId];
            return next;
          });
          setJustClearedHexId(hexId);
        }
        return;
      }

      if (resources.strikes < 1) {
        notify('Need 1 Strike to attack. Log more Strength!', 'error');
        return;
      }

      const strikesToUse = Math.min(resources.strikes, currentEnemyHp);
      const nextResources = spendStrikes(resources, strikesToUse);
      if (!nextResources) return;
      setResources(nextResources);

      const newEnemyHp = currentEnemyHp - strikesToUse;
      setEncounterHealth((prev) => {
        const next = { ...prev };
        if (newEnemyHp <= 0) delete next[hexId];
        else next[hexId] = newEnemyHp;
        return next;
      });

      if (newEnemyHp <= 0) {
        // Victory: grant loot/XP, mark hex cleared
        const fullEncounter = campaign.encounters.find(
          (e) => e.id === encounter.id || (e.name === encounter.name && e.type === encounter.type)
        );
        const xpGain = fullEncounter?.xp ?? (encounter.type === 'basic' ? 1 : encounter.type === 'elite' ? 2 : 4);
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
        if (encounter.type === 'boss') {
          setCampaignStatus('victory');
        }
        if (encounter.id) {
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
        if (character.startingMoveId === 'aura-of-conquest') {
          setResources((r) => ({ ...r, wards: r.wards + 1 }));
        }
        setAnchorUses((prev) => {
          const next = { ...prev };
          delete next[hexId];
          return next;
        });
        setJustClearedHexId(hexId);
        return;
      }

      // Retaliation: enemy survived — spend 1 Ward or 1 Aether to absorb, else lose 1 HP
      const hasWard = nextResources.wards > 0;
      const hasAether = nextResources.aether >= 1;
      if (hasWard) {
        const afterWard = spendWards(nextResources, 1);
        if (afterWard) setResources(afterWard);
      } else if (hasAether) {
        const afterAether = spendAether(nextResources, 1);
        if (afterAether) setResources(afterAether);
      } else {
        // No ward or aether: lose 1 HP; at 0 HP apply knockback (or Defy Reality: sacrifice 1 item, full HP, no knockback)
        const wouldBeZeroHp = character.hp <= 1;
        if (wouldBeZeroHp && character.startingMoveId === 'defy-reality' && inventory.length > 0) {
          setInventory((prev) => (prev.length <= 1 ? [] : prev.slice(1)));
          setCharacterState((prev) => (prev ? { ...prev, hp: prev.maxHp ?? 5 } : null));
          return;
        }
        if (wouldBeZeroHp) {
          notify('You hit zero health and are returning to the starting point.', 'info');
        }
        setCharacterState((prev) => {
          if (!prev) return null;
          const newHp = Math.max(0, prev.hp - 1);
          if (newHp > 0) return { ...prev, hp: newHp };
          return { ...prev, hp: prev.maxHp ?? 5 };
        });
        if (wouldBeZeroHp) {
          const start =
            campaign.realm.startingHex ?? (() => {
              const startHexId = getDefaultStartHexId(cols, rows);
              const [q, r] = startHexId.split(',').map(Number);
              return { q, r };
            })();
          setPlayerPos(start);
          setProgression((p) => ({ ...p, currency: Math.max(0, p.currency - 50) }));
        }
      }
    },
    [
      resources,
      character,
      encounterHealth,
      clearedHexes,
      inventory,
      riftProgress,
      campaign.encounters,
      campaign.rifts,
      placedEncounters,
      cols,
      rows,
      notify,
    ]
  );

  const useDimensionalAnchor = useCallback(
    (hexId: string): boolean => {
      const encounter = placedEncounters[hexId];
      if (!encounter || (encounter.type !== 'elite' && encounter.type !== 'boss')) {
        notify('Dimensional Anchor can only be used on Elite or Boss encounters.', 'error');
        return false;
      }
      if (anchorUses[hexId]) {
        notify('You have already used Dimensional Anchor on this encounter.', 'error');
        return false;
      }
      if (resources.aether < 2) {
        notify('Need 2 Aether for Dimensional Anchor.', 'error');
        return false;
      }
      if (!character || character.startingMoveId !== 'dimensional-anchor') {
        notify('Dimensional Anchor is a Rift-Weaver move.', 'error');
        return false;
      }
      const enemyStrikes = encounter.strikes ?? 1;
      const currentEnemyHp = encounterHealth[hexId] ?? enemyStrikes;
      if (currentEnemyHp <= 0) return false;

      const afterAether = spendAether(resources, 2);
      if (!afterAether) return false;
      setResources(afterAether);
      setAnchorUses((prev) => ({ ...prev, [hexId]: true }));

      const newEnemyHp = currentEnemyHp - 1;
      setEncounterHealth((prev) => {
        const next = { ...prev };
        if (newEnemyHp <= 0) delete next[hexId];
        else next[hexId] = newEnemyHp;
        return next;
      });

      if (newEnemyHp <= 0) {
        const fullEncounter = campaign.encounters.find(
          (e) => e.id === encounter.id || (e.name === encounter.name && e.type === encounter.type)
        );
        const xpGain = fullEncounter?.xp ?? (encounter.type === 'elite' ? 2 : 4);
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
        if (encounter.type === 'boss') setCampaignStatus('victory');
        if (encounter.id && fullEncounter?.loot_drop) {
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
        const startingMoveId: string = character.startingMoveId;
        if (startingMoveId === 'aura-of-conquest') {
          setResources((r) => ({ ...r, wards: r.wards + 1 }));
        }
        setAnchorUses((prev) => {
          const next = { ...prev };
          delete next[hexId];
          return next;
        });
        setJustClearedHexId(hexId);
      }
      return true;
    },
    [
      placedEncounters,
      anchorUses,
      resources,
      character,
      encounterHealth,
      campaign.encounters,
      notify,
    ]
  );

  const nexusSynthesizerHeal = useCallback((): boolean => {
    if (!character || character.startingMoveId !== 'nexus-synthesizer') {
      notify('Nexus Synthesizer is a Rift-Weaver move.', 'error');
      return false;
    }
    if (resources.aether < 2) {
      notify('Need 2 Aether for Nexus Synthesizer.', 'error');
      return false;
    }
    const afterAether = spendAether(resources, 2);
    if (!afterAether) return false;
    setResources(afterAether);
    setCharacterState((prev) => {
      if (!prev) return null;
      const maxHp = prev.maxHp ?? 5;
      const currentHp = prev.hp ?? maxHp;
      const newHp = Math.min(maxHp, currentHp + 3);
      if (newHp === currentHp) return prev;
      return { ...prev, hp: newHp };
    });
    return true;
  }, [character, resources, notify]);

  const onScoutHex = useCallback(
    (hexId: string): boolean => {
      if (!character || character.startingMoveId !== 'scout-the-multiverse') {
        notify('Scout the Multiverse is a Wayfinder move.', 'error');
        return false;
      }
      if (resources.aether < 1) {
        notify('Need 1 Aether to Scout. Log Wellness.', 'error');
        return false;
      }
      if (revealedHexes.has(hexId)) {
        notify('That hex is already revealed.', 'error');
        return false;
      }
      const nextRingIds = getHexIdsAtDistance(playerPos.q, playerPos.r, 2);
      if (!nextRingIds.includes(hexId)) {
        notify('You can only reveal a hex in the next ring (2 steps away).', 'error');
        return false;
      }
      const afterAether = spendAether(resources, 1);
      if (!afterAether) return false;
      setResources(afterAether);
      setRevealedHexes((prev) => new Set(prev).add(hexId));
      return true;
    },
    [character, playerPos, resources, revealedHexes, notify]
  );

  const useConsumable = useCallback((item: InventoryItem) => {
    if (item.kind !== 'consumable') return;
    const effect = getConsumableEffect(item.id);
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
    if (effect.addWards) {
      setResources((r) => ({ ...r, wards: r.wards + effect.addWards! }));
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
  }, []);

  const heal = useCallback(
    (amount: number): boolean => {
      if (amount <= 0 || !character) return false;
      const afterAether = spendAether(resources, amount);
      if (!afterAether) return false;
      setResources(afterAether);
      setCharacterState((prev) => {
        if (!prev) return null;
        const maxHp = prev.maxHp ?? 5;
        const currentHp = prev.hp ?? maxHp;
        const newHp = Math.min(maxHp, currentHp + amount);
        if (newHp === currentHp) return prev;
        return { ...prev, hp: newHp };
      });
      return true;
    },
    [resources, character]
  );

  const purchaseReward = useCallback(
    (reward: NexusReward) => {
      const next = spendCurrency(progression, reward.cost);
      if (!next) return;
      setProgression(next);
      notify(`Purchased ${reward.title}! Go treat yourself.`, 'info');
    },
    [notify, progression]
  );

  const completeLevelUp = useCallback((choice: LevelUpChoice) => {
    setPendingProgressionAfterLevelUp((nextProg) => {
      if (!nextProg) return null;
      setCharacterState((prev) => {
        if (!prev) return null;
        const updated =
          choice.type === 'new_move' || choice.type === 'cross_class_move'
            ? { ...prev, learnedMoveIds: [...(prev.learnedMoveIds ?? []), choice.moveId] }
            : { ...prev, stats: { ...prev.stats, [choice.stat]: prev.stats[choice.stat] + 1 } };
        return { ...updated, hp: updated.maxHp ?? 5 };
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
        encounterHealth,
        campaignStatus,
        anchorUses,
      },
      pendingLevelUp: pendingLevelUp || undefined,
      pendingProgressionAfterLevelUp: pendingProgressionAfterLevelUp ?? undefined,
    });
  }, [character, resources, progression, inventory, playerPos, revealedHexes, clearedHexes, encounterHealth, anchorUses, riftProgress, campaignStatus, pendingLevelUp, pendingProgressionAfterLevelUp]);

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
    encounterHealth,
    setEncounterHealth,
    anchorUses,
    setAnchorUses,
    useDimensionalAnchor,
    nexusSynthesizerHeal,
    onScoutHex,
    justClearedHexId,
    setJustClearedHexId,
    riftProgress,
    setRiftProgress,
    campaignStatus,
    logWorkout,
    movePlayer,
    engageEncounter,
    attemptRiftStage,
    useConsumable,
    heal,
    purchaseReward,
    pendingLevelUp,
    pendingProgressionAfterLevelUp,
    completeLevelUp,
  };
}
