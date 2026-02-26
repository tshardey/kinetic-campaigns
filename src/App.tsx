import { useState, useEffect, useCallback } from 'react';
import { Map as MapIcon, Tent } from 'lucide-react';
import type { Character, CharacterResources, Progression, InventoryItem } from '@/types/character';
import type { ActivityType } from '@/types/character';
import type { MapEncounter, NexusReward } from '@/types/campaign';
import { applyActivity, canAffordMove, spendSlipstream, canAffordEncounter, spendForEncounter } from '@/engine/resources';
import { applyEncounterReward, spendCurrency } from '@/engine/progression';
import { getAdjacentHexIds, generateRectGrid } from '@/engine/hex-math';
import { placeEncounters, getDefaultStartHexId } from '@/engine/encounter-placement';
import { applyArtifactOnAcquisition, getConsumableEffect, lootDropToInventoryItem } from '@/engine/inventory';
import { loadCharacter, saveCharacter } from '@/lib/character-storage';
import { CharacterPanel } from '@/components/sidebar/CharacterPanel';
import { CharacterCreation } from '@/components/character-creation/CharacterCreation';
import { HexGrid } from '@/components/hex-grid/HexGrid';
import { NexusTent } from '@/components/nexus/NexusTent';
import { omijaCampaign } from '@/data/omija';

const MAP_COLS = 14;
const MAP_ROWS = 9;
const PLACEMENT_SEED = 42;

const grid = generateRectGrid(MAP_COLS, MAP_ROWS);
const START_HEX_ID = getDefaultStartHexId(MAP_COLS, MAP_ROWS);
const [startQ, startR] = START_HEX_ID.split(',').map(Number);

const PLACED_ENCOUNTERS = placeEncounters(
  { grid, cols: MAP_COLS, rows: MAP_ROWS, seed: PLACEMENT_SEED, startHexId: START_HEX_ID },
  omijaCampaign
);

const MOCK_NEXUS_REWARDS: NexusReward[] = [
  { id: 1, title: 'Fancy Bath Product', cost: 50, icon: '🛁', desc: 'Lush bath bomb or Epsom salts' },
  { id: 2, title: 'Personal Sauna Drop-in', cost: 150, icon: '🔥', desc: '1 hour at the local sauna' },
  { id: 3, title: 'New Workout Gear', cost: 300, icon: '👕', desc: 'Fresh athletic wear' },
  { id: 4, title: 'Specialty Studio Class', cost: 500, icon: '🧘', desc: 'Drop-in to a premium boutique gym' },
  { id: 5, title: 'Professional Massage', cost: 1000, icon: '💆', desc: '90-minute deep tissue massage' },
];

const DEFAULT_RESOURCES: CharacterResources = { slipstream: 5, strikes: 2, wards: 0, aether: 1 };
const DEFAULT_PROGRESSION: Progression = { xp: 0, level: 1, currency: 120 };
const INITIAL_REVEALED = (() => {
  const set = new Set<string>([START_HEX_ID]);
  getAdjacentHexIds(startQ, startR).forEach((id) => set.add(id));
  return set;
})();

function getInitialState(character: Character | null) {
  return {
    resources: character?.resources ?? DEFAULT_RESOURCES,
    progression: character?.progression ?? DEFAULT_PROGRESSION,
    inventory: character?.inventory ?? [],
  };
}

function App() {
  const [character, setCharacter] = useState<Character | null>(() => loadCharacter());
  const initialState = getInitialState(character);
  const [activeTab, setActiveTab] = useState<'map' | 'nexus'>('map');
  const [resources, setResources] = useState(initialState.resources);
  const [progression, setProgression] = useState(initialState.progression);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialState.inventory);
  const [playerPos, setPlayerPos] = useState({ q: startQ, r: startR });
  const [revealedHexes, setRevealedHexes] = useState(INITIAL_REVEALED);
  const [clearedHexes, setClearedHexes] = useState(new Set<string>([]));
  const [justClearedHexId, setJustClearedHexId] = useState<string | null>(null);

  useEffect(() => {
    if (character) {
      setResources(character.resources);
      setProgression(character.progression);
      setInventory(character.inventory ?? []);
    }
  }, [character]);

  const logWorkout = (type: ActivityType) => {
    setResources((prev) => applyActivity(prev, type));
  };

  const movePlayer = (q: number, r: number, id: string) => {
    const dq = Math.abs(playerPos.q - q);
    const dr = Math.abs(playerPos.r - r);
    const ds = Math.abs(-playerPos.q - playerPos.r - (-q - r));
    const distance = Math.max(dq, dr, ds);
    if (distance !== 1) return;
    if (!canAffordMove(resources)) {
      alert('Not enough Slipstream Tokens! Log some Cardio.');
      return;
    }
    const nextResources = spendSlipstream(resources);
    if (!nextResources) return;
    setResources(nextResources);
    setPlayerPos({ q, r });
    const newRevealed = new Set(revealedHexes);
    newRevealed.add(id);
    getAdjacentHexIds(q, r).forEach((adjId) => newRevealed.add(adjId));
    setRevealedHexes(newRevealed);
  };

  const engageEncounter = (hexId: string, encounter: MapEncounter) => {
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

    // Add loot to inventory (resolve full encounter for loot_drop)
    if (encounter.type !== 'anomaly' && encounter.id) {
      const fullEncounter = omijaCampaign.encounters.find(
        (e) => e.id === encounter.id || (e.name === encounter.name && e.type === encounter.type)
      );
      if (fullEncounter?.loot_drop) {
        const item = lootDropToInventoryItem(fullEncounter.loot_drop);
        setInventory((prev) => [...prev, item]);
        if (item.kind === 'artifact' && character) {
          const newStats = applyArtifactOnAcquisition(item.id, character.stats);
          if (newStats) setCharacter((prev) => (prev ? { ...prev, stats: newStats } : null));
        }
      }
    }
    setJustClearedHexId(hexId);
  };

  const useConsumable = useCallback(
    (item: InventoryItem, choice?: 'haste' | 'flow') => {
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
        setCharacter((prev) => {
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
        setCharacter((prev) => (prev ? { ...prev, parasolShieldActive: effect.parasolShieldActive } : null));
      }
    },
    []
  );

  useEffect(() => {
    if (!character) return;
    saveCharacter({
      ...character,
      resources,
      progression,
      inventory,
    });
  }, [character, resources, progression, inventory]);

  const purchaseReward = (reward: NexusReward) => {
    const next = spendCurrency(progression, reward.cost);
    if (!next) return;
    setProgression(next);
    alert(`Purchased ${reward.title}! Go treat yourself.`);
  };

  if (!character) {
    return <CharacterCreation onComplete={() => setCharacter(loadCharacter())} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
      <CharacterPanel
        character={character}
        progression={progression}
        resources={resources}
        inventory={inventory}
        onLogActivity={logWorkout}
        onUseConsumable={useConsumable}
      />

      <main className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden">
        <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center px-6 absolute top-0 w-full z-10">
          <nav className="flex space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'map'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <MapIcon className="w-4 h-4 mr-2" /> Realm Map
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('nexus')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'nexus'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Tent className="w-4 h-4 mr-2" /> The Nexus Tent
            </button>
          </nav>
        </header>

        <div className="flex-1 mt-16 relative">
          {activeTab === 'map' && (
            <HexGrid
              cols={MAP_COLS}
              rows={MAP_ROWS}
              mapBackgroundUrl={omijaCampaign.realm.map_background_url}
              playerPos={playerPos}
              revealedHexes={revealedHexes}
              clearedHexes={clearedHexes}
              justClearedHexId={justClearedHexId}
              encounters={PLACED_ENCOUNTERS}
              campaign={omijaCampaign}
              lootFrameUrl={omijaCampaign.realm.loot_frame_url}
              onMove={movePlayer}
              onEngageEncounter={engageEncounter}
              onContinueFromVictory={() => setJustClearedHexId(null)}
            />
          )}
          {activeTab === 'nexus' && (
            <NexusTent
              currency={progression.currency}
              rewards={MOCK_NEXUS_REWARDS}
              onPurchase={purchaseReward}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
