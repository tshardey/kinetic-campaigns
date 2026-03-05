import { useState } from 'react';
import { Footprints, Sword, Shield, Flame } from 'lucide-react';
import type { ActivityType } from '@/types/character';
import { ACTIVITY_MINUTES_PER_POINT } from '@/engine/resources';

interface ActivityLoggerProps {
  onLogActivity: (type: ActivityType, durationMinutes?: number) => void;
}

const ACTIVITIES: Array<{
  type: ActivityType;
  label: string;
  icon: typeof Footprints;
  unitLabel: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  examples: string;
}> = [
  {
    type: 'cardio',
    label: 'Cardio',
    icon: Footprints,
    unitLabel: 'Slipstream',
    bgClass: 'bg-teal-500/10 hover:bg-teal-500/20',
    borderClass: 'border-teal-500/20',
    textClass: 'text-teal-300',
    examples: 'e.g. running, biking, swimming, boxing',
  },
  {
    type: 'strength',
    label: 'Strength',
    icon: Sword,
    unitLabel: 'Strike',
    bgClass: 'bg-orange-500/10 hover:bg-orange-500/20',
    borderClass: 'border-orange-500/20',
    textClass: 'text-orange-300',
    examples: 'e.g. lifting, barre, pilates, calisthenics',
  },
  {
    type: 'yoga',
    label: 'Agility',
    icon: Shield,
    unitLabel: 'Ward',
    bgClass: 'bg-blue-500/10 hover:bg-blue-500/20',
    borderClass: 'border-blue-500/20',
    textClass: 'text-blue-300',
    examples: 'e.g. yoga, martial arts, dancing',
  },
  {
    type: 'wellness',
    label: 'Wellness / Prep',
    icon: Flame,
    unitLabel: 'Aether',
    bgClass: 'bg-purple-500/10 hover:bg-purple-500/20',
    borderClass: 'border-purple-500/20',
    textClass: 'text-purple-300',
    examples: 'e.g. healthy home cooked meal, meditation, massage, relaxing bath',
  },
];

export function ActivityLogger({ onLogActivity }: ActivityLoggerProps) {
  const [duration, setDuration] = useState<Record<ActivityType, number>>({
    cardio: ACTIVITY_MINUTES_PER_POINT,
    strength: ACTIVITY_MINUTES_PER_POINT,
    yoga: ACTIVITY_MINUTES_PER_POINT,
    wellness: ACTIVITY_MINUTES_PER_POINT,
  });

  return (
    <>
      <h2 className="text-xs uppercase tracking-widest text-slate-500 mt-8 mb-4 font-bold">
        Log Activity
      </h2>
      <p className="text-[11px] text-slate-500 mb-3">
        20 min = 1 point for all activities; points round down to the nearest half (e.g. 30 min = 1.5 points).
      </p>
      <div className="space-y-2">
        {ACTIVITIES.map(({ type, label, icon: Icon, unitLabel, bgClass, borderClass, textClass, examples }) => (
          <div
            key={type}
            className={`flex flex-col gap-1.5 p-3 rounded-lg border ${bgClass} ${borderClass}`}
            title={examples}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`flex items-center text-sm font-medium ${textClass} cursor-help`}>
                <Icon className="w-4 h-4 mr-2 shrink-0" />
                {label}
              </span>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                20 min = +1 {unitLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={999}
                step={5}
                value={duration[type] || ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                  setDuration((prev) => ({ ...prev, [type]: isNaN(v) ? ACTIVITY_MINUTES_PER_POINT : v }));
                }}
                className="w-16 rounded bg-slate-800 border border-slate-600 px-2 py-1 text-sm text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder={`${ACTIVITY_MINUTES_PER_POINT}`}
                aria-label={`${label} duration (minutes)`}
              />
              <span className="text-xs text-slate-500">min</span>
              <button
                type="button"
                onClick={() => onLogActivity(type, duration[type] || ACTIVITY_MINUTES_PER_POINT)}
                className="ml-auto text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition-colors"
              >
                Log
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
