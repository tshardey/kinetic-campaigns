import { Sparkles } from 'lucide-react';
import type { CharacterResources, Progression } from '@/types/character';
import type { ActivityType } from '@/types/character';
import { getXpCap } from '@/engine/progression';
import { ResourceDisplay } from './ResourceDisplay';
import { ActivityLogger } from './ActivityLogger';

interface CharacterPanelProps {
  progression: Progression;
  resources: CharacterResources;
  onLogActivity: (type: ActivityType) => void;
}

export function CharacterPanel({
  progression,
  resources,
  onLogActivity,
}: CharacterPanelProps) {
  const xpCap = getXpCap(progression.level);
  const xpPercent = (progression.xp / xpCap) * 100;

  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-10">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500 mb-1">
          Kinetic Campaigns
        </h1>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
          The Worldhopper
        </p>
      </div>

      {/* Level & XP */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50">
        <div className="flex justify-between items-end mb-2">
          <div>
            <span className="text-sm text-slate-400">Level</span>
            <span className="text-2xl font-bold text-white ml-2">{progression.level}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-amber-400 font-bold flex items-center">
              <Sparkles className="w-3 h-3 mr-1" /> {progression.currency} Currency
            </span>
          </div>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
        <div className="text-right mt-1 text-xs text-slate-500">
          {progression.xp} / {xpCap} XP
        </div>
      </div>

      {/* Resources & Activity Log */}
      <div className="p-6 border-b border-slate-800 flex-1 overflow-y-auto">
        <ResourceDisplay resources={resources} />
        <ActivityLogger onLogActivity={onLogActivity} />
      </div>
    </aside>
  );
}
