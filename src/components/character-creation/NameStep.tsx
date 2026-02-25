import { User } from 'lucide-react';

interface NameStepProps {
  name: string;
  onNameChange: (value: string) => void;
  onNext: () => void;
}

export function NameStep({ name, onNameChange, onNext }: NameStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">What shall we call you?</h2>
        <p className="text-slate-400 text-sm">Your name in the multiverse.</p>
      </div>
      <div className="relative">
        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter your name"
          className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          maxLength={32}
          autoFocus
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Next — Choose playbook
        </button>
      </div>
    </div>
  );
}
