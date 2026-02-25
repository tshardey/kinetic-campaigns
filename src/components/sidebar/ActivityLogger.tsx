import { Footprints, Sword, Shield, Flame } from 'lucide-react';
import type { ActivityType } from '@/types/character';

interface ActivityLoggerProps {
  onLogActivity: (type: ActivityType) => void;
}

const ACTIVITIES: Array<{
  type: ActivityType;
  label: string;
  icon: typeof Footprints;
  reward: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}> = [
  {
    type: 'cardio',
    label: '20m Cardio',
    icon: Footprints,
    reward: '+1 Slipstream',
    bgClass: 'bg-teal-500/10 hover:bg-teal-500/20',
    borderClass: 'border-teal-500/20',
    textClass: 'text-teal-300',
  },
  {
    type: 'strength',
    label: '15m Strength',
    icon: Sword,
    reward: '+1 Strike',
    bgClass: 'bg-orange-500/10 hover:bg-orange-500/20',
    borderClass: 'border-orange-500/20',
    textClass: 'text-orange-300',
  },
  {
    type: 'yoga',
    label: '20m Yoga',
    icon: Shield,
    reward: '+1 Ward',
    bgClass: 'bg-blue-500/10 hover:bg-blue-500/20',
    borderClass: 'border-blue-500/20',
    textClass: 'text-blue-300',
  },
  {
    type: 'wellness',
    label: 'Wellness / Prep',
    icon: Flame,
    reward: '+1 Aether',
    bgClass: 'bg-purple-500/10 hover:bg-purple-500/20',
    borderClass: 'border-purple-500/20',
    textClass: 'text-purple-300',
  },
];

export function ActivityLogger({ onLogActivity }: ActivityLoggerProps) {
  return (
    <>
      <h2 className="text-xs uppercase tracking-widest text-slate-500 mt-8 mb-4 font-bold">
        Log Activity (Mock)
      </h2>
      <div className="space-y-2">
        {ACTIVITIES.map(({ type, label, icon: Icon, reward, bgClass, borderClass, textClass }) => (
          <button
            key={type}
            type="button"
            onClick={() => onLogActivity(type)}
            className={`w-full flex items-center justify-between p-3 rounded-lg ${bgClass} ${textClass} transition-colors border ${borderClass}`}
          >
            <span className="flex items-center text-sm font-medium">
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </span>
            <span className="text-xs font-bold">{reward}</span>
          </button>
        ))}
      </div>
    </>
  );
}
