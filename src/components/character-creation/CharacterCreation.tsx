import { useState } from 'react';
import { buildCharacter, PLAYBOOKS } from '@/data/playbooks';
import type { PlaybookId } from '@/types/character';
import { saveCharacter } from '@/lib/character-storage';
import { NameStep } from './NameStep';
import { PlaybookStep } from './PlaybookStep';
import { StartingMoveStep } from './StartingMoveStep';

export type CreationStep = 'name' | 'playbook' | 'move';

interface CharacterCreationProps {
  onComplete: () => void;
}

export function CharacterCreation({ onComplete }: CharacterCreationProps) {
  const [step, setStep] = useState<CreationStep>('name');
  const [name, setName] = useState('');
  const [playbookId, setPlaybookId] = useState<PlaybookId | null>(null);
  const [startingMoveId, setStartingMoveId] = useState<string | null>(null);

  const handleFinish = () => {
    if (!playbookId || !startingMoveId) return;
    const character = buildCharacter(name, playbookId, startingMoveId);
    saveCharacter(character);
    onComplete();
  };

  const playbook = playbookId ? PLAYBOOKS.find((p) => p.id === playbookId) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            Kinetic Campaigns
          </h1>
          <p className="text-slate-500 uppercase tracking-wider text-sm font-semibold mt-2">
            Create your Worldhopper
          </p>
        </header>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl p-8">
          {step === 'name' && (
            <NameStep
              name={name}
              onNameChange={setName}
              onNext={() => setStep('playbook')}
            />
          )}
          {step === 'playbook' && (
            <PlaybookStep
              selectedId={playbookId}
              onSelect={setPlaybookId}
              onBack={() => setStep('name')}
              onNext={() => setStep('move')}
            />
          )}
          {step === 'move' && playbook && (
            <StartingMoveStep
              playbook={playbook}
              selectedMoveId={startingMoveId}
              onSelect={setStartingMoveId}
              onBack={() => setStep('playbook')}
              onFinish={handleFinish}
            />
          )}
        </div>

        <div className="flex justify-center gap-2 mt-6">
          {(['name', 'playbook', 'move'] as const).map((s) => (
            <div
              key={s}
              className={`h-1.5 w-12 rounded-full transition-colors ${
                (s === 'name' && step === 'name') ||
                (s === 'playbook' && step === 'playbook') ||
                (s === 'move' && step === 'move')
                  ? 'bg-teal-500'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
