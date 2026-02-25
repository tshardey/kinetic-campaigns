import { Sparkles } from 'lucide-react';
import type { NexusReward } from '@/types/campaign';
import { RewardCard } from './RewardCard';

interface NexusTentProps {
  currency: number;
  rewards: NexusReward[];
  onPurchase: (reward: NexusReward) => void;
}

export function NexusTent({ currency, rewards, onPurchase }: NexusTentProps) {
  return (
    <div className="absolute inset-0 overflow-y-auto p-10 bg-slate-950">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">The Nexus Tent</h2>
            <p className="text-slate-400">
              Trade your dimensional currency for real-world rewards.
            </p>
          </div>
          <div className="bg-slate-800/80 px-6 py-4 rounded-2xl border border-slate-700 flex items-center">
            <Sparkles className="w-6 h-6 text-amber-400 mr-3" />
            <span className="text-3xl font-black text-amber-400">{currency}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              currency={currency}
              onPurchase={onPurchase}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
