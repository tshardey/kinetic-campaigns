import { useState } from 'react';
import { Map as MapIcon, Tent } from 'lucide-react';
import type { NexusReward } from '@/types/campaign';
import { loadCharacter } from '@/lib/character-storage';
import { CharacterPanel } from '@/components/sidebar/CharacterPanel';
import { CharacterCreation } from '@/components/character-creation/CharacterCreation';
import { HexGrid } from '@/components/hex-grid/HexGrid';
import { NexusTent } from '@/components/nexus/NexusTent';
import { useCampaign } from '@/hooks/useCampaign';
import { useGameState } from '@/hooks/useGameState';

const MOCK_NEXUS_REWARDS: NexusReward[] = [
  { id: 1, title: 'Fancy Bath Product', cost: 50, icon: '🛁', desc: 'Lush bath bomb or Epsom salts' },
  { id: 2, title: 'Personal Sauna Drop-in', cost: 150, icon: '🔥', desc: '1 hour at the local sauna' },
  { id: 3, title: 'New Workout Gear', cost: 300, icon: '👕', desc: 'Fresh athletic wear' },
  { id: 4, title: 'Specialty Studio Class', cost: 500, icon: '🧘', desc: 'Drop-in to a premium boutique gym' },
  { id: 5, title: 'Professional Massage', cost: 1000, icon: '💆', desc: '90-minute deep tissue massage' },
];

function App() {
  const campaignState = useCampaign();
  const { cols, rows, campaign, placedEncounters } = campaignState;

  const {
    character,
    setCharacter,
    resources,
    progression,
    inventory,
    playerPos,
    revealedHexes,
    clearedHexes,
    justClearedHexId,
    setJustClearedHexId,
    logWorkout,
    movePlayer,
    engageEncounter,
    useConsumable,
    purchaseReward,
  } = useGameState({ cols, rows, campaign });

  const [activeTab, setActiveTab] = useState<'map' | 'nexus'>('map');

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
              cols={cols}
              rows={rows}
              mapBackgroundUrl={campaign.realm.map_background_url}
              playerPos={playerPos}
              revealedHexes={revealedHexes}
              clearedHexes={clearedHexes}
              justClearedHexId={justClearedHexId}
              encounters={placedEncounters}
              campaign={campaign}
              lootFrameUrl={campaign.realm.loot_frame_url}
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
