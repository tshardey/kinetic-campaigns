import { useState } from 'react';
import { Footprints, Sword, Shield, Flame } from 'lucide-react';
import type { ActivityType } from '@/types/character';
import { ACTIVITY_MINUTES_PER_UNIT } from '@/engine/resources';

interface ActivityLoggerProps {
  onLogActivity: (type: ActivityType, durationMinutes?: number) => void;
}

const ACTIVITIES: Array<{
  type: ActivityType;
  label: string;
  icon: typeof Footprints;
  unitLabel: string;
  minutesPerUnit: number;
  bgClass: string;
  borderClass: string;
  textClass: string;
}> = [
  {
    type: 'cardio',
    label: 'Cardio',
    icon: Footprints,
    unitLabel: 'Slipstream',
    minutesPerUnit: 20,
    bgClass: 'bg-teal-500/10 hover:bg-teal-500/20',
    borderClass: 'border-teal-500/20',
    textClass: 'text-teal-300',
  },
  {
    type: 'strength',
    label: 'Strength',
    icon: Sword,
    unitLabel: 'Strike',
    minutesPerUnit: 15,
    bgClass: 'bg-orange-500/10 hover:bg-orange-500/20',
    borderClass: 'border-orange-500/20',
    textClass: 'text-orange-300',
  },
  {
    type: 'yoga',
    label: 'Yoga',
    icon: Shield,
    unitLabel: 'Ward',
    minutesPerUnit: 20,
    bgClass: 'bg-blue-500/10 hover:bg-blue-500/20',
    borderClass: 'border-blue-500/20',
    textClass: 'text-blue-300',
  },
  {
    type: 'wellness',
    label: 'Wellness / Prep',
    icon: Flame,
    unitLabel: 'Aether',
    minutesPerUnit: 15,
    bgClass: 'bg-purple-500/10 hover:bg-purple-500/20',
    borderClass: 'border-purple-500/20',
    textClass: 'text-purple-300',
  },
];

export function ActivityLogger({ onLogActivity }: ActivityLoggerProps) {
  const [duration, setDuration] = useState<Record<ActivityType, number>>({
    cardio: 20,
    strength: 15,
    yoga: 20,
    wellness: 15,
  });

  return (
    <>
      <h2 className="text-xs uppercase tracking-widest text-slate-500 mt-8 mb-4 font-bold">
        Log Activity
      </h2>
      <p className="text-[11px] text-slate-500 mb-3">
        Enter minutes; rewards scale by duration (e.g. 20 min cardio = 1 Slipstream).
      </p>
      <div className="space-y-2">
        {ACTIVITIES.map(({ type, label, icon: Icon, unitLabel, minutesPerUnit, bgClass, borderClass, textClass }) => (
          <div
            key={type}
            className={`flex flex-col gap-1.5 p-3 rounded-lg border ${bgClass} ${borderClass}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`flex items-center text-sm font-medium ${textClass}`}>
                <Icon className="w-4 h-4 mr-2 shrink-0" />
                {label}
              </span>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                {minutesPerUnit} min = +1 {unitLabel}
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
                  setDuration((prev) => ({ ...prev, [type]: isNaN(v) ? ACTIVITY_MINUTES_PER_UNIT[type] : v }));
                }}
                className="w-16 rounded bg-slate-800 border border-slate-600 px-2 py-1 text-sm text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder={`${minutesPerUnit}`}
                aria-label={`${label} duration (minutes)`}
              />
              <span className="text-xs text-slate-500">min</span>
              <button
                type="button"
                onClick={() => onLogActivity(type, duration[type] || ACTIVITY_MINUTES_PER_UNIT[type])}
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
