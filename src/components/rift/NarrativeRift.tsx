import type { NarrativeRift, NarrativeRiftStage } from '@/types/campaign';
import type { Character, CharacterResources } from '@/types/character';
import { canAffordRiftStage, getRiftStageCostLabel } from '@/engine/rift';

interface NarrativeRiftProps {
  rift: NarrativeRift;
  character: Character;
  resources: CharacterResources;
  /** Number of stages completed (0 = none, stages.length = full completion). */
  completedStages: number;
  /** True when this hex was just cleared (show victory/completion panel). */
  isJustCompleted: boolean;
  lootFrameUrl: string;
  onAttemptStage: (stageIndex: number) => boolean;
  onContinue: () => void;
  /** Close the panel without engaging (e.g. Leave / Back). */
  onLeave: () => void;
}

export function NarrativeRiftPanel({
  rift,
  character,
  resources,
  completedStages,
  isJustCompleted,
  lootFrameUrl,
  onAttemptStage,
  onContinue,
  onLeave,
}: NarrativeRiftProps) {
  const totalStages = rift.stages.length;
  const isFullyComplete = completedStages >= totalStages;
  const currentStageIndex = Math.min(completedStages, totalStages - 1);
  const currentStage: NarrativeRiftStage | undefined = rift.stages[currentStageIndex];
  const canAfford = currentStage ? canAffordRiftStage(resources, character.stats, currentStage) : false;

  // Completion / victory view
  if (isJustCompleted && isFullyComplete) {
    return (
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-slate-800/95 border border-slate-600 p-6 rounded-2xl shadow-2xl w-[28rem] max-w-[95vw] text-center animate-in slide-in-from-bottom-10 fade-in">
        {rift.completion_loot && (
          <div className="flex justify-center mb-4">
            <div className="relative inline-block w-32 h-32">
              {rift.completion_loot.image_url && (
                <img
                  src={rift.completion_loot.image_url}
                  alt={rift.completion_loot.name}
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
        <h3 className="text-lg font-bold text-emerald-400 mb-1">Rift Complete</h3>
        <p className="text-slate-300 text-sm mb-3">{rift.name} — The feline spirits honor you.</p>
        <div className="flex flex-wrap justify-center gap-4 text-sm mb-4">
          {rift.completion_xp != null && rift.completion_xp > 0 && (
            <span className="text-indigo-300 font-medium">+{rift.completion_xp} XP</span>
          )}
        </div>
        {rift.completion_loot && (
          <div className="bg-slate-700/60 rounded-xl p-3 mb-4 text-left">
            <p className="text-slate-200 font-medium text-sm">{rift.completion_loot.name}</p>
            {rift.completion_loot.description && (
              <p className="text-slate-400 text-xs mt-0.5">{rift.completion_loot.description}</p>
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

  // In-progress: show current stage
  if (!currentStage) return null;

  const costLabel = getRiftStageCostLabel(currentStage);

  return (
    <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-slate-800/95 border border-slate-600 p-0 rounded-2xl shadow-2xl w-[28rem] max-w-[95vw] overflow-hidden animate-in slide-in-from-bottom-10 fade-in">
      {/* Stage art */}
      {currentStage.image_url && (
        <div className="w-full min-h-40 max-h-72 bg-slate-900 flex items-center justify-center py-2">
          <img
            src={currentStage.image_url}
            alt=""
            className="max-w-full max-h-64 w-auto h-auto object-contain object-center"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-xl font-bold text-white truncate">{rift.name}</h3>
          <span className="shrink-0 px-2.5 py-0.5 rounded-md text-xs font-semibold border bg-violet-900/80 text-violet-200 border-violet-600">
            Narrative Rift
          </span>
        </div>
        <p className="text-slate-400 text-xs mb-3">
          Stage {currentStageIndex + 1} of {totalStages}
        </p>
        <h4 className="text-lg font-semibold text-slate-200 mb-2">{currentStage.name}</h4>
        <p className="text-slate-300 text-sm mb-4 whitespace-pre-wrap">{currentStage.description}</p>

        {/* Activity / resource requirement */}
        <div className="bg-slate-700/50 rounded-xl p-3 mb-4">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">
            Required (earn by logging activities)
          </p>
          <p className="text-slate-200 text-sm">
            <strong>{costLabel}</strong>
            {canAfford ? (
              <span className="ml-2 text-emerald-400 text-xs">✓ You can attempt</span>
            ) : (
              <span className="ml-2 text-amber-400 text-xs">— log more to try</span>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onLeave}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Leave
          </button>
          <button
            type="button"
            onClick={() => onAttemptStage(currentStageIndex)}
            disabled={!canAfford}
            className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-violet-500/20"
          >
            {currentStageIndex === 0 ? 'Enter the Rift' : totalStages - 1 === currentStageIndex ? 'Face the Final Trial' : 'Attempt Stage'}
          </button>
        </div>
      </div>
    </div>
  );
}
