import type { NexusReward } from '@/types/campaign';

interface RewardCardProps {
  reward: NexusReward;
  currency: number;
  onPurchase: (reward: NexusReward) => void;
}

export function RewardCard({ reward, currency, onPurchase }: RewardCardProps) {
  const canAfford = currency >= reward.cost;

  const handleClick = () => {
    if (canAfford) {
      onPurchase(reward);
    } else {
      alert('Not enough Currency!');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors flex flex-col">
      <div className="text-4xl mb-4">{reward.icon}</div>
      <h3 className="text-lg font-bold text-white mb-1">{reward.title}</h3>
      <p className="text-sm text-slate-500 flex-1 mb-6">{reward.desc}</p>

      <button
        type="button"
        onClick={handleClick}
        className={`w-full py-3 rounded-xl font-bold transition-all flex justify-center items-center ${
          canAfford
            ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
        }`}
      >
        {reward.cost} Currency
      </button>
    </div>
  );
}
