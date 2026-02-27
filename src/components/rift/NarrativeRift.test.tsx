/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { NarrativeRiftPanel } from './NarrativeRift';
import type { NarrativeRift } from '@/types/campaign';
import type { Character, CharacterResources } from '@/types/character';

const defaultResources: CharacterResources = {
  slipstream: 5,
  strikes: 2,
  wards: 0,
  aether: 1,
};

const defaultCharacter: Character = {
  name: 'Test',
  playbook: 'gate-crasher',
  startingMoveId: 'momentum-strike',
  stats: { brawn: 2, flow: 0, haste: 1, focus: -1 },
  resources: defaultResources,
  progression: { xp: 0, level: 1, currency: 0 },
  hp: 5,
  maxHp: 5,
};

const riftWithCostStages: NarrativeRift = {
  id: 'moon-cats-vigil',
  name: "The Moon-Cat's Vigil",
  description: 'A 3-stage rift.',
  stages: [
    {
      id: 's1',
      name: 'The Shattered Guardian',
      cost: { resource: 'strikes', amount: 1 },
      description: 'Haul the stone fragments.',
      image_url: '/s1.png',
    },
    {
      id: 's2',
      name: 'The Shadow Serpent',
      cost: { resource: 'slipstream', amount: 1 },
      description: 'Dodge and redirect.',
      image_url: '/s2.png',
    },
  ],
  completion_xp: 2,
};

describe('NarrativeRiftPanel', () => {
  it('renders rift name and current stage when in progress', () => {
    render(
      <NarrativeRiftPanel
        rift={riftWithCostStages}
        character={defaultCharacter}
        resources={defaultResources}
        completedStages={0}
        isJustCompleted={false}
        lootFrameUrl="/frame.png"
        onAttemptStage={() => true}
        onContinue={() => {}}
        onLeave={() => {}}
      />
    );
    expect(screen.getByText("The Moon-Cat's Vigil")).toBeInTheDocument();
    expect(screen.getByText('The Shattered Guardian')).toBeInTheDocument();
    expect(screen.getByText(/Stage 1 of 2/)).toBeInTheDocument();
  });

  it('shows activity-based requirement label (Strike / log Strength)', () => {
    render(
      <NarrativeRiftPanel
        rift={riftWithCostStages}
        character={defaultCharacter}
        resources={defaultResources}
        completedStages={0}
        isJustCompleted={false}
        lootFrameUrl="/frame.png"
        onAttemptStage={() => true}
        onContinue={() => {}}
        onLeave={() => {}}
      />
    );
    expect(screen.getByText(/1 Strike \(log Strength\)/)).toBeInTheDocument();
  });

  it('renders Leave button and calls onLeave when clicked', () => {
    const onLeave = vi.fn();
    render(
      <NarrativeRiftPanel
        rift={riftWithCostStages}
        character={defaultCharacter}
        resources={defaultResources}
        completedStages={0}
        isJustCompleted={false}
        lootFrameUrl="/frame.png"
        onAttemptStage={() => true}
        onContinue={() => {}}
        onLeave={onLeave}
      />
    );
    const leaveBtn = screen.getByRole('button', { name: /leave/i });
    expect(leaveBtn).toBeInTheDocument();
    fireEvent.click(leaveBtn);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('renders Enter the Rift when stage 0', () => {
    render(
      <NarrativeRiftPanel
        rift={riftWithCostStages}
        character={defaultCharacter}
        resources={defaultResources}
        completedStages={0}
        isJustCompleted={false}
        lootFrameUrl="/frame.png"
        onAttemptStage={() => true}
        onContinue={() => {}}
        onLeave={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /enter the rift/i })).toBeInTheDocument();
  });

  it('renders Rift Complete and Continue when just completed', () => {
    render(
      <NarrativeRiftPanel
        rift={riftWithCostStages}
        character={defaultCharacter}
        resources={defaultResources}
        completedStages={2}
        isJustCompleted={true}
        lootFrameUrl="/frame.png"
        onAttemptStage={() => true}
        onContinue={() => {}}
        onLeave={() => {}}
      />
    );
    expect(screen.getByText(/rift complete/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /leave/i })).not.toBeInTheDocument();
  });

  it('disables attempt button when cannot afford', () => {
    render(
      <NarrativeRiftPanel
        rift={riftWithCostStages}
        character={defaultCharacter}
        resources={{ ...defaultResources, strikes: 0 }}
        completedStages={0}
        isJustCompleted={false}
        lootFrameUrl="/frame.png"
        onAttemptStage={() => true}
        onContinue={() => {}}
        onLeave={() => {}}
      />
    );
    const attemptBtn = screen.getByRole('button', { name: /enter the rift/i });
    expect(attemptBtn).toBeDisabled();
  });
});
