import type {
  MapEncounter,
  CampaignPackage,
  Encounter,
  DimensionalAnomaly,
} from '@/types/campaign';
import type { CharacterResources } from '@/types/character';
import { canAffordEncounter } from '@/engine/resources';

function getFullEncounter(
  encounter: MapEncounter,
  campaign: CampaignPackage | null
): Encounter | DimensionalAnomaly | null {
  if (!campaign) return null;
  if (encounter.type === 'anomaly') {
    return (
      campaign.anomalies.find(
        (a) => a.id === encounter.id || a.name === encounter.name
      ) ?? null
    );
  }
  return (
    campaign.encounters.find(
      (e) => e.id === encounter.id || (e.name === encounter.name && e.type === encounter.type)
    ) ?? null
  );
}

function getTierLabel(type: MapEncounter['type']): string {
  if (type === 'basic') return 'Basic';
  if (type === 'elite') return 'Elite';
  if (type === 'boss') return 'Boss';
  return 'Anomaly';
}

function getTierStyles(type: MapEncounter['type']): string {
  if (type === 'basic') return 'bg-amber-900/80 text-amber-200 border-amber-600';
  if (type === 'elite') return 'bg-rose-900/80 text-rose-200 border-rose-600';
  if (type === 'boss') return 'bg-violet-900/80 text-violet-200 border-violet-500';
  return 'bg-sky-900/80 text-sky-200 border-sky-500';
}

interface EncounterPanelProps {
  encounter: MapEncounter;
  campaign: CampaignPackage | null;
  lootFrameUrl: string;
  isVictory: boolean;
  resources?: CharacterResources;
  onEngage: () => void;
  onContinue: () => void;
}

export function EncounterPanel({
  encounter,
  campaign,
  lootFrameUrl,
  isVictory,
  resources,
  onEngage,
  onContinue,
}: EncounterPanelProps) {
  const full = getFullEncounter(encounter, campaign);
  const isCombat = full && 'strikes' in full;
  const isAnomaly = encounter.type === 'anomaly';
  const imageUrl =
    full && 'image_url' in full && full.image_url ? full.image_url : undefined;
  const lootDrop =
    isCombat && 'loot_drop' in full ? (full as Encounter).loot_drop : undefined;
  const xp = isCombat && 'xp' in full ? (full as Encounter).xp : undefined;
  const xpEarned =
    encounter.type === 'elite' ? 1 : encounter.type === 'boss' ? 3 : 0;
  const tierLabel = getTierLabel(encounter.type);
  const tierStyles = getTierStyles(encounter.type);
  const anomalyLore = isAnomaly && full && 'lore_text' in full ? (full as DimensionalAnomaly).lore_text : undefined;

  const costShape = isAnomaly
    ? { type: 'anomaly' as const, cost: encounter.cost, resource: encounter.resource, resource_amount: encounter.resource_amount }
    : { type: encounter.type, strikes: encounter.strikes };
  const canAfford = resources && canAffordEncounter(resources, costShape);
  const resourceLabel = isAnomaly
    ? (encounter.resource === 'strikes' ? 'Strike(s)' : encounter.resource === 'wards' ? 'Ward(s)' : 'Slipstream')
    : '';

  if (isVictory) {
    return (
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-slate-800/95 border border-slate-600 p-6 rounded-2xl shadow-2xl w-[28rem] max-w-[95vw] text-center animate-in slide-in-from-bottom-10 fade-in">
        {/* Loot frame + item only when there is a loot drop (combat only) */}
        {lootDrop && (
          <div className="flex justify-center mb-4">
            <div className="relative inline-block w-32 h-32">
              {/* Item art behind the frame, slightly smaller so it stays inside the border */}
              {lootDrop.image_url && (
                <img
                  src={lootDrop.image_url}
                  alt={lootDrop.name}
                  className="absolute inset-[18%] w-[64%] h-[64%] object-contain"
                />
              )}
              <img
                src={lootFrameUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
                aria-hidden
              />
            </div>
          </div>
        )}
        <h3 className="text-lg font-bold text-emerald-400 mb-1">Victory!</h3>
        <p className="text-slate-300 text-sm mb-3">{encounter.name} cleared.</p>
        <div className="flex flex-wrap justify-center gap-4 text-sm mb-4">
          <span className="text-amber-400 font-medium">
            +{encounter.gold} gold
          </span>
          {xp !== undefined && xp > 0 && (
            <span className="text-indigo-300 font-medium">+{xpEarned} XP</span>
          )}
        </div>
        {anomalyLore && (
          <div className="bg-sky-900/30 border border-sky-600/50 rounded-xl p-3 mb-4 text-left">
            <p className="text-sky-200 text-sm italic">&ldquo;{anomalyLore}&rdquo;</p>
          </div>
        )}
        {lootDrop && (
          <div className="bg-slate-700/60 rounded-xl p-3 mb-4 text-left">
            <p className="text-slate-200 font-medium text-sm">{lootDrop.name}</p>
            {lootDrop.description && (
              <p className="text-slate-400 text-xs mt-0.5">
                {lootDrop.description}
              </p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-slate-800/95 border border-slate-600 p-0 rounded-2xl shadow-2xl w-[28rem] max-w-[95vw] overflow-hidden animate-in slide-in-from-bottom-10 fade-in">
      {/* Artwork */}
      {imageUrl && (
        <div className="w-full min-h-40 max-h-72 bg-slate-900 flex items-center justify-center py-2">
          <img
            src={imageUrl}
            alt=""
            className="max-w-full max-h-64 w-auto h-auto object-contain object-center"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-xl font-bold text-white truncate">
            {encounter.name}
          </h3>
          <span
            className={`shrink-0 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${tierStyles}`}
          >
            {tierLabel}
          </span>
        </div>

        {/* Requirements */}
        <div className="mb-4">
          {encounter.type === 'anomaly' ? (
            <div className="space-y-2">
              <p className="text-slate-200 text-sm">
                Dimensional anomaly: resolve with <strong>{encounter.resource_amount} {resourceLabel}</strong> and{' '}
                <strong>{encounter.cost} Aether</strong>.
              </p>
              {resources !== undefined && !canAfford && (
                <p className="text-amber-400/90 text-xs">
                  {resources[encounter.resource] < encounter.resource_amount
                    ? `Need ${encounter.resource_amount - resources[encounter.resource]} more ${resourceLabel} (log ${encounter.resource === 'strikes' ? 'Strength' : encounter.resource === 'wards' ? 'Yoga' : 'Cardio'}).`
                    : resources.aether < encounter.cost
                      ? `Need ${encounter.cost - resources.aether} more Aether (log Wellness).`
                      : null}
                </p>
              )}
            </div>
          ) : (
            <p className="text-slate-200 text-sm">
              Requires <strong>{encounter.strikes} Strikes</strong> to defeat.
            </p>
          )}
        </div>

        {/* Loot preview */}
        {(lootDrop || encounter.gold > 0 || (xp !== undefined && xp > 0) || isAnomaly) && (
          <div className="bg-slate-700/50 rounded-xl p-3 mb-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">
              Rewards
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="text-amber-400">{encounter.gold} gold</span>
              {xp !== undefined && xp > 0 && (
                <span className="text-indigo-300">+{xp} XP</span>
              )}
              {lootDrop && (
                <span className="text-slate-200 flex items-center gap-1.5">
                  {lootDrop.image_url && (
                    <img
                      src={lootDrop.image_url}
                      alt=""
                      className="w-5 h-5 object-contain rounded"
                    />
                  )}
                  {lootDrop.name}
                </span>
              )}
              {isAnomaly && !lootDrop && (
                <span className="text-sky-300 text-xs">Lore / temporary clarity</span>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onEngage}
          disabled={resources !== undefined && !canAfford}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
        >
          {isAnomaly ? 'Resolve Anomaly' : 'Engage Encounter'}
        </button>
      </div>
    </div>
  );
}
