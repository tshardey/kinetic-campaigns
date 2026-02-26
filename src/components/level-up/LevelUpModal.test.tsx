/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LevelUpModal } from './LevelUpModal';
import type { Character } from '@/types/character';

const baseCharacter: Character = {
  name: 'Test',
  playbook: 'gate-crasher',
  startingMoveId: 'momentum-strike',
  stats: { brawn: 2, flow: 0, haste: 1, focus: -1 },
  resources: { slipstream: 5, strikes: 2, wards: 0, aether: 1 },
  progression: { xp: 0, level: 1, currency: 120 },
};

describe('LevelUpModal', () => {
  it('renders level-up title and new level', () => {
    const onChoose = vi.fn();
    render(
      <LevelUpModal character={baseCharacter} newLevel={2} onChoose={onChoose} />
    );

    expect(screen.getByText('Level up!')).toBeInTheDocument();
    expect(screen.getByText(/You reached level/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows three reward options', () => {
    const onChoose = vi.fn();
    render(
      <LevelUpModal character={baseCharacter} newLevel={2} onChoose={onChoose} />
    );

    expect(screen.getByText(/New move \(your playbook\)/)).toBeInTheDocument();
    expect(screen.getByText(/Cross-class move/)).toBeInTheDocument();
    expect(screen.getByText('+1 Stat')).toBeInTheDocument();
  });

  it('calls onChoose with stat when +1 Stat then stat is selected', () => {
    const onChoose = vi.fn();
    render(
      <LevelUpModal character={baseCharacter} newLevel={2} onChoose={onChoose} />
    );

    fireEvent.click(screen.getByText('+1 Stat'));
    expect(screen.getByText('Brawn')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Brawn/ }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith({ type: 'stat', stat: 'brawn' });
  });

  it('calls onChoose with new_move when playbook move is selected', () => {
    const onChoose = vi.fn();
    render(
      <LevelUpModal character={baseCharacter} newLevel={2} onChoose={onChoose} />
    );

    fireEvent.click(screen.getByText(/New move \(your playbook\)/));
    const moveButton = screen.getByRole('button', { name: /Aura of Conquest/i });
    fireEvent.click(moveButton);

    expect(onChoose).toHaveBeenCalledWith({
      type: 'new_move',
      moveId: 'aura-of-conquest',
    });
  });

  it('calls onChoose with cross_class_move when cross-class move is selected', () => {
    const onChoose = vi.fn();
    render(
      <LevelUpModal character={baseCharacter} newLevel={2} onChoose={onChoose} />
    );

    fireEvent.click(screen.getByText(/Cross-class move/));
    const moveButton = screen.getByRole('button', { name: /Aether Shield/i });
    fireEvent.click(moveButton);

    expect(onChoose).toHaveBeenCalledWith({
      type: 'cross_class_move',
      moveId: 'aether-shield',
    });
  });

  it('Back button returns to pick step', () => {
    const onChoose = vi.fn();
    render(
      <LevelUpModal character={baseCharacter} newLevel={2} onChoose={onChoose} />
    );

    fireEvent.click(screen.getByText('+1 Stat'));
    expect(screen.getByText('Brawn')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(screen.getByText(/New move \(your playbook\)/)).toBeInTheDocument();
    expect(onChoose).not.toHaveBeenCalled();
  });
});
