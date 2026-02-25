import type { PlaybookDefinition } from '@/types/character';

interface StartingMoveStepProps {
  playbook: PlaybookDefinition;
  selectedMoveId: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onFinish: () => void;
}

export function StartingMoveStep({
  playbook,
  selectedMoveId,
  onSelect,
  onBack,
  onFinish,
}: StartingMoveStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Choose your starting move</h2>
        <p className="text-slate-400 text-sm">
          As a <span className="text-teal-400 font-medium">{playbook.name}</span>, pick one move to
          start with.
        </p>
      </div>

      <div className="space-y-3">
        {playbook.startingMoves.map((move) => {
          const isSelected = selectedMoveId === move.id;
          return (
            <button
              key={move.id}
              type="button"
              onClick={() => onSelect(move.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-teal-500 bg-teal-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <h3 className="font-semibold text-white">{move.name}</h3>
              <p className="text-sm text-slate-400 mt-1">{move.description}</p>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={!selectedMoveId}
          className="px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Begin journey
        </button>
      </div>
    </div>
  );
}
