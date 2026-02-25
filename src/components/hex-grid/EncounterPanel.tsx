import type { MapEncounter } from '@/types/campaign';

interface EncounterPanelProps {
  encounter: MapEncounter;
  onEngage: () => void;
}

export function EncounterPanel({ encounter, onEngage }: EncounterPanelProps) {
  const requirement =
    encounter.type === 'anomaly'
      ? `Requires ${encounter.cost} Aether to clear.`
      : `Requires ${encounter.strikes} Strikes to defeat.`;

  return (
    <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-2xl w-96 text-center animate-in slide-in-from-bottom-10 fade-in">
      <h3 className="text-xl font-bold text-white mb-2">{encounter.name}</h3>
      <p className="text-slate-400 text-sm mb-4">{requirement}</p>
      <button
        type="button"
        onClick={onEngage}
        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
      >
        Engage Encounter
      </button>
    </div>
  );
}
