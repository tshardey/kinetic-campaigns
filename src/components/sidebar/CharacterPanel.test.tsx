/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CharacterPanel } from './CharacterPanel';
import type { Character } from '@/types/character';

const mockCharacter: Character = {
  name: 'Test Hero',
  playbook: 'gate-crasher',
  startingMoveId: 'momentum-strike',
  stats: { brawn: 2, flow: 0, haste: 1, focus: -1 },
  resources: { slipstream: 5, strikes: 2, wards: 0, aether: 1 },
  progression: { xp: 0, level: 1, currency: 120 },
};

const defaultProps = {
  character: mockCharacter,
  progression: mockCharacter.progression,
  resources: mockCharacter.resources,
  onLogActivity: () => {},
};

describe('CharacterPanel', () => {
  describe('Character sheet collapsible section', () => {
    it('shows character sheet content when expanded by default', () => {
      render(<CharacterPanel {...defaultProps} />);
      expect(screen.getByText('Character sheet')).toBeInTheDocument();
      expect(screen.getByText('Gate-Crasher')).toBeInTheDocument();
      expect(screen.getByText('Momentum Strike')).toBeInTheDocument();
    });

    it('hides character sheet content when toggle is clicked', () => {
      render(<CharacterPanel {...defaultProps} />);
      const toggle = screen.getByRole('button', { name: /character sheet/i });
      fireEvent.click(toggle);
      expect(screen.getByText('Character sheet')).toBeInTheDocument();
      expect(screen.queryByText('Gate-Crasher')).not.toBeInTheDocument();
      expect(screen.queryByText('Momentum Strike')).not.toBeInTheDocument();
    });

    it('shows character sheet content again when toggle is clicked twice', () => {
      render(<CharacterPanel {...defaultProps} />);
      const toggle = screen.getByRole('button', { name: /character sheet/i });
      fireEvent.click(toggle);
      expect(screen.queryByText('Gate-Crasher')).not.toBeInTheDocument();
      fireEvent.click(toggle);
      expect(screen.getByText('Gate-Crasher')).toBeInTheDocument();
      expect(screen.getByText('Momentum Strike')).toBeInTheDocument();
    });

    it('toggle has aria-expanded true when expanded, false when collapsed', () => {
      render(<CharacterPanel {...defaultProps} />);
      const toggle = screen.getByRole('button', { name: /character sheet/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
