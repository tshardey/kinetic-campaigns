import { Footprints, Sword, Shield, Flame } from 'lucide-react';
import type { CharacterResources } from '@/types/character';

interface ResourceDisplayProps {
  resources: CharacterResources;
}

const RESOURCES: Array<{
  key: keyof CharacterResources;
  label: string;
  icon: typeof Footprints;
  iconColor: string;
}> = [
  { key: 'slipstream', label: 'Slipstream', icon: Footprints, iconColor: 'text-teal-400' },
  { key: 'strikes', label: 'Strikes', icon: Sword, iconColor: 'text-orange-400' },
  { key: 'wards', label: 'Wards', icon: Shield, iconColor: 'text-blue-400' },
  { key: 'aether', label: 'Aether', icon: Flame, iconColor: 'text-purple-400' },
];

export function ResourceDisplay({ resources }: ResourceDisplayProps) {
  return (
    <>
      <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-bold">
        Dimensional Resources
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {RESOURCES.map(({ key, label, icon: Icon, iconColor }) => (
          <div
            key={key}
            className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center"
          >
            <Icon className={`w-5 h-5 ${iconColor} mb-1`} />
            <span className="text-2xl font-bold">{resources[key]}</span>
            <span className="text-[10px] uppercase text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
