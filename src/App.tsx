import { useState } from 'react';
import { Map as MapIcon, Tent } from 'lucide-react';
import type { CharacterResources, Progression } from '@/types/character';
import type { ActivityType } from '@/types/character';
import type { MapEncounter, NexusReward } from '@/types/campaign';
import { applyActivity, canAffordMove, spendSlipstream, canAffordEncounter, spendForEncounter } from '@/engine/resources';
import { applyEncounterReward, spendCurrency } from '@/engine/progression';
import { getAdjacentHexIds, generateRectGrid } from '@/engine/hex-math';
import { placeEncounters, getDefaultStartHexId } from '@/engine/encounter-placement';
import { CharacterPanel } from '@/components/sidebar/CharacterPanel';
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

const INITIAL_RESOURCES: CharacterResources = { slipstream: 5, strikes: 2, wards: 0, aether: 1 };
const INITIAL_PROGRESSION: Progression = { xp: 4, level: 1, currency: 120 };
const INITIAL_REVEALED = (() => {
  const set = new Set<string>([START_HEX_ID]);
  getAdjacentHexIds(startQ, startR).forEach((id) => set.add(id));
  return set;
})();

function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'nexus'>('map');
  const [resources, setResources] = useState(INITIAL_RESOURCES);
  const [progression, setProgression] = useState(INITIAL_PROGRESSION);
  const [playerPos, setPlayerPos] = useState({ q: startQ, r: startR });
  const [revealedHexes, setRevealedHexes] = useState(INITIAL_REVEALED);
  const [clearedHexes, setClearedHexes] = useState(new Set<string>([]));

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
  };

  const purchaseReward = (reward: NexusReward) => {
    const next = spendCurrency(progression, reward.cost);
    if (!next) return;
    setProgression(next);
    alert(`Purchased ${reward.title}! Go treat yourself.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
      <CharacterPanel
        progression={progression}
        resources={resources}
        onLogActivity={logWorkout}
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
              encounters={PLACED_ENCOUNTERS}
              onMove={movePlayer}
              onEngageEncounter={engageEncounter}
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
