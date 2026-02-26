/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CharacterPanel } from './CharacterPanel';
import type { Character, InventoryItem } from '@/types/character';

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
  inventory: [] as InventoryItem[],
  onLogActivity: () => {},
  onUseConsumable: () => {},
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

  describe('Inventory section', () => {
    it('shows empty state when inventory is empty', () => {
      render(<CharacterPanel {...defaultProps} />);
      const inventoryToggle = screen.getByRole('button', { name: /inventory/i });
      expect(inventoryToggle).toBeInTheDocument();
      expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
    });

    it('shows inventory items when present', () => {
      const inventory: InventoryItem[] = [
        {
          id: 'memory-censer',
          name: 'Memory Censer',
          kind: 'consumable',
          description: 'Use: Clears mental fog, granting 1 free Strike.',
        },
        {
          id: 'talon-of-the-west-wind',
          name: 'Talon of the West Wind',
          kind: 'artifact',
          description: 'Permanently buffs Haste.',
        },
      ];
      render(<CharacterPanel {...defaultProps} inventory={inventory} />);
      expect(screen.getByText('Memory Censer')).toBeInTheDocument();
      expect(screen.getByText('Talon of the West Wind')).toBeInTheDocument();
      expect(screen.getByText(/consumable/i)).toBeInTheDocument();
      expect(screen.getByText(/artifact \(buff applied\)/i)).toBeInTheDocument();
    });

    it('shows Use button for consumables', () => {
      const inventory: InventoryItem[] = [
        { id: 'memory-censer', name: 'Memory Censer', kind: 'consumable' },
      ];
      render(<CharacterPanel {...defaultProps} inventory={inventory} />);
      expect(screen.getByRole('button', { name: 'Use' })).toBeInTheDocument();
    });

    it('calls onUseConsumable when Use is clicked for simple consumable', () => {
      const onUseConsumable = vi.fn();
      const inventory: InventoryItem[] = [
        { id: 'memory-censer', name: 'Memory Censer', kind: 'consumable' },
      ];
      render(
        <CharacterPanel {...defaultProps} inventory={inventory} onUseConsumable={onUseConsumable} />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Use' }));
      expect(onUseConsumable).toHaveBeenCalledTimes(1);
      expect(onUseConsumable).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'memory-censer', kind: 'consumable' })
      );
    });

    it('shows Restore Haste and Restore Flow when Use is clicked for Vial of Sun-Catch', () => {
      const inventory: InventoryItem[] = [
        { id: 'vial-of-sun-catch', name: 'Vial of Sun-Catch', kind: 'consumable' },
      ];
      render(<CharacterPanel {...defaultProps} inventory={inventory} />);
      fireEvent.click(screen.getByRole('button', { name: 'Use' }));
      expect(screen.getByRole('button', { name: 'Restore Haste' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Restore Flow' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('calls onUseConsumable with choice when Restore Haste is clicked for Vial', () => {
      const onUseConsumable = vi.fn();
      const inventory: InventoryItem[] = [
        { id: 'vial-of-sun-catch', name: 'Vial of Sun-Catch', kind: 'consumable' },
      ];
      render(
        <CharacterPanel {...defaultProps} inventory={inventory} onUseConsumable={onUseConsumable} />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Use' }));
      fireEvent.click(screen.getByRole('button', { name: 'Restore Haste' }));
      expect(onUseConsumable).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'vial-of-sun-catch' }),
        'haste'
      );
    });

    it('calls onUseConsumable with choice when Restore Flow is clicked for Vial', () => {
      const onUseConsumable = vi.fn();
      const inventory: InventoryItem[] = [
        { id: 'vial-of-sun-catch', name: 'Vial of Sun-Catch', kind: 'consumable' },
      ];
      render(
        <CharacterPanel {...defaultProps} inventory={inventory} onUseConsumable={onUseConsumable} />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Use' }));
      fireEvent.click(screen.getByRole('button', { name: 'Restore Flow' }));
      expect(onUseConsumable).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'vial-of-sun-catch' }),
        'flow'
      );
    });

    it('inventory toggle shows count badge when items present', () => {
      const inventory: InventoryItem[] = [
        { id: 'memory-censer', name: 'Memory Censer', kind: 'consumable' },
      ];
      render(<CharacterPanel {...defaultProps} inventory={inventory} />);
      const inventoryToggle = screen.getByRole('button', { name: /inventory/i });
      expect(within(inventoryToggle).getByText('1')).toBeInTheDocument();
    });
  });
});
