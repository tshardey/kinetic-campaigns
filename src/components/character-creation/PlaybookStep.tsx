import { Sparkles, Shield, Compass } from 'lucide-react';
import { PLAYBOOKS } from '@/data/playbooks';
import type { PlaybookId } from '@/types/character';

const ICONS: Record<PlaybookId, typeof Sparkles> = {
  'rift-weaver': Sparkles,
  'gate-crasher': Shield,
  wayfinder: Compass,
};

interface PlaybookStepProps {
  selectedId: PlaybookId | null;
  onSelect: (id: PlaybookId) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PlaybookStep({ selectedId, onSelect, onBack, onNext }: PlaybookStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Choose your playbook</h2>
        <p className="text-slate-400 text-sm">Your class defines your starting stats and style.</p>
      </div>

      <div className="space-y-3">
        {PLAYBOOKS.map((p) => {
          const Icon = ICONS[p.id];
          const isSelected = selectedId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-teal-500 bg-teal-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-2 rounded-lg ${
                    isSelected ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white">{p.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{p.description}</p>
                  <div className="flex gap-3 mt-2 text-xs">
                    <span className={p.stats.brawn >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      Brawn {p.stats.brawn >= 0 ? '+' : ''}{p.stats.brawn}
                    </span>
                    <span className={p.stats.flow >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      Flow {p.stats.flow >= 0 ? '+' : ''}{p.stats.flow}
                    </span>
                    <span className={p.stats.haste >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      Haste {p.stats.haste >= 0 ? '+' : ''}{p.stats.haste}
                    </span>
                    <span className={p.stats.focus >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      Focus {p.stats.focus >= 0 ? '+' : ''}{p.stats.focus}
                    </span>
                  </div>
                </div>
              </div>
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
          onClick={onNext}
          disabled={!selectedId}
          className="px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Next — Starting move
        </button>
      </div>
    </div>
  );
}
