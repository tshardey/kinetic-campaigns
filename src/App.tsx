import { useState, useEffect } from 'react';
import { Map as MapIcon, Tent, PanelLeftClose, PanelLeft } from 'lucide-react';
import type { NexusReward } from '@/types/campaign';
import { loadCharacter } from '@/lib/character-storage';
import { CharacterPanel } from '@/components/sidebar/CharacterPanel';
import { CharacterCreation } from '@/components/character-creation/CharacterCreation';
import { HexGrid } from '@/components/hex-grid/HexGrid';
import { LevelUpModal } from '@/components/level-up/LevelUpModal';
import { NexusTent } from '@/components/nexus/NexusTent';
import { useToast } from '@/contexts/ToastContext';
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
  const { toast } = useToast();
  const campaignState = useCampaign();
  const { cols, rows, campaign, placedEncounters, placedRifts } = campaignState;

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
    encounterHealth,
    anchorUses,
    riftProgress,
    logWorkout,
    movePlayer,
    engageEncounter,
    useDimensionalAnchor,
    nexusSynthesizerHeal,
    onScoutHex,
    attemptRiftStage,
    useConsumable,
    heal,
    purchaseReward,
    pendingLevelUp,
    pendingProgressionAfterLevelUp,
    completeLevelUp,
  } = useGameState({ cols, rows, campaign, placedEncounters, toast });

  const [activeTab, setActiveTab] = useState<'map' | 'nexus'>('map');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // On viewport >= md, show sidebar by default; on small screens start collapsed
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setSidebarOpen(mq.matches);
    const handler = () => setSidebarOpen(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!character) {
    return <CharacterCreation onComplete={() => setCharacter(loadCharacter())} />;
  }

  const newLevel = pendingProgressionAfterLevelUp?.level ?? progression.level + 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
      {/* Sidebar: collapsible; on mobile overlays (fixed), on md+ takes width in flow */}
      <div
        className={`shrink-0 overflow-hidden transition-[width] duration-200 ease-out ${
          sidebarOpen ? 'w-80' : 'w-0'
        }`}
      >
        <div
          className={`fixed md:relative inset-y-0 left-0 z-20 w-80 h-full transform transition-transform duration-200 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <CharacterPanel
            character={character}
            progression={progression}
            resources={resources}
            inventory={inventory}
            onLogActivity={logWorkout}
            onUseConsumable={useConsumable}
            onHeal={heal}
            onNexusSynthesizerHeal={nexusSynthesizerHeal}
            onCloseSidebar={() => setSidebarOpen(false)}
          />
        </div>
      </div>
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-10 bg-black/50 md:hidden"
          aria-label="Close sidebar"
        />
      )}

      <main className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden min-w-0">
        <header className="h-14 md:h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center px-3 md:px-6 absolute top-0 w-full z-10 shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 mr-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 md:mr-4"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
          </button>
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

        <div className="flex-1 mt-14 md:mt-16 relative min-h-0 touch-manipulation">
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
              encounterHealth={encounterHealth}
              anchorUses={anchorUses}
              placedRifts={placedRifts}
              riftProgress={riftProgress}
              campaign={campaign}
              character={character}
              lootFrameUrl={campaign.realm.loot_frame_url}
              resources={resources}
              startingHex={campaign.realm.startingHex}
              onMove={movePlayer}
              onOpenNexus={() => setActiveTab('nexus')}
              onEngageEncounter={engageEncounter}
              useDimensionalAnchor={useDimensionalAnchor}
              onScoutHex={onScoutHex}
              onAttemptRiftStage={attemptRiftStage}
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

      {pendingLevelUp && (
        <LevelUpModal
          character={character}
          newLevel={newLevel}
          onChoose={completeLevelUp}
        />
      )}
    </div>
  );
}

export default App;
