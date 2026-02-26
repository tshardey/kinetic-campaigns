import { useState } from 'react';
import { Sparkles, Sword, BookOpen, TrendingUp } from 'lucide-react';
import type { Character, CharacterStats, LevelUpChoice } from '@/types/character';
import { getPlaybook, PLAYBOOKS } from '@/data/playbooks';

export type { LevelUpChoice };

interface LevelUpModalProps {
  character: Character;
  newLevel: number;
  onChoose: (choice: LevelUpChoice) => void;
}

const STAT_LABELS: Record<keyof CharacterStats, string> = {
  brawn: 'Brawn',
  flow: 'Flow',
  haste: 'Haste',
  focus: 'Focus',
};

export function LevelUpModal({ character, newLevel, onChoose }: LevelUpModalProps) {
  const [step, setStep] = useState<'pick' | 'new_move' | 'cross_class' | 'stat'>('pick');
  const playbook = getPlaybook(character.playbook);
  const learnedSet = new Set([character.startingMoveId, ...(character.learnedMoveIds ?? [])]);

  const samePlaybookMoves =
    playbook?.startingMoves.filter((m) => !learnedSet.has(m.id)) ?? [];
  const otherPlaybooksMoves = PLAYBOOKS.filter((p) => p.id !== character.playbook).flatMap(
    (p) => p.startingMoves
  );

  if (step === 'pick') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Level up!</h2>
          </div>
          <p className="text-slate-300 mb-6">
            You reached level <span className="font-bold text-teal-400">{newLevel}</span>. Choose one reward:
          </p>
          <div className="space-y-3">
            <button
              type="button"
              disabled={samePlaybookMoves.length === 0}
              onClick={() => setStep('new_move')}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-colors ${
                samePlaybookMoves.length > 0
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-600'
                  : 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Sword className="w-5 h-5 text-teal-400 shrink-0" />
              <div>
                <p className="font-medium text-white">New move (your playbook)</p>
                <p className="text-xs text-slate-400">
                  {samePlaybookMoves.length > 0
                    ? `Learn one of ${samePlaybookMoves.length} remaining move(s)`
                    : 'No more moves from your playbook'}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStep('cross_class')}
              className="w-full flex items-center gap-3 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-left transition-colors"
            >
              <BookOpen className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <p className="font-medium text-white">Cross-class move</p>
                <p className="text-xs text-slate-400">Learn a move from another playbook</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStep('stat')}
              className="w-full flex items-center gap-3 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-left transition-colors"
            >
              <TrendingUp className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-medium text-white">+1 Stat</p>
                <p className="text-xs text-slate-400">Increase Brawn, Flow, Haste, or Focus by 1</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'new_move' && samePlaybookMoves.length > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg font-bold text-white mb-2">Choose a move (your playbook)</h2>
          <p className="text-sm text-slate-400 mb-4">Learn one of these moves from {playbook?.name}.</p>
          <div className="space-y-2">
            {samePlaybookMoves.map((move) => (
              <button
                key={move.id}
                type="button"
                onClick={() => onChoose({ type: 'new_move', moveId: move.id })}
                className="w-full p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-left"
              >
                <p className="font-medium text-white">{move.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{move.description}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep('pick')}
            className="mt-4 text-sm text-slate-400 hover:text-white"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (step === 'cross_class') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg font-bold text-white mb-2">Choose a cross-class move</h2>
          <p className="text-sm text-slate-400 mb-4">Learn a move from another playbook.</p>
          <div className="space-y-2">
            {otherPlaybooksMoves.map((move) => (
              <button
                key={move.id}
                type="button"
                onClick={() => onChoose({ type: 'cross_class_move', moveId: move.id })}
                className="w-full p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-left"
              >
                <p className="font-medium text-white">{move.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{move.description}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep('pick')}
            className="mt-4 text-sm text-slate-400 hover:text-white"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (step === 'stat') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6">
          <h2 className="text-lg font-bold text-white mb-2">+1 Stat</h2>
          <p className="text-sm text-slate-400 mb-4">Choose which stat to increase.</p>
          <div className="grid grid-cols-2 gap-2">
            {(['brawn', 'flow', 'haste', 'focus'] as const).map((stat) => (
              <button
                key={stat}
                type="button"
                onClick={() => onChoose({ type: 'stat', stat })}
                className="p-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600"
              >
                <p className="font-medium text-white">{STAT_LABELS[stat]}</p>
                <p className="text-xs text-slate-500">Current: {character.stats[stat] >= 0 ? '+' : ''}{character.stats[stat]}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep('pick')}
            className="mt-4 text-sm text-slate-400 hover:text-white"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return null;
}
