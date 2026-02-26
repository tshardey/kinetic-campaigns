/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

function TestConsumer() {
  const { toast } = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast('Hello')}>
        Toast info
      </button>
      <button type="button" onClick={() => toast('Error message', 'error')}>
        Toast error
      </button>
    </div>
  );
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('useToast throws when used outside ToastProvider', () => {
    expect(() => render(<TestConsumer />)).toThrow(
      'useToast must be used within ToastProvider'
    );
  });

  it('toast adds message to the container', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    expect(screen.queryByText('Hello')).not.toBeInTheDocument();

    act(() => {
      screen.getByRole('button', { name: /Toast info/ }).click();
    });

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('toast with error type renders message', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: /Toast error/ }).click();
    });

    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('dismiss button removes toast', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: /Toast info/ }).click();
    });

    expect(screen.getByText('Hello')).toBeInTheDocument();

    const dismissButtons = screen.getAllByRole('button', { name: 'Dismiss' });
    act(() => {
      dismissButtons[0].click();
    });

    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('toast auto-dismisses after duration', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: /Toast info/ }).click();
    });

    expect(screen.getByText('Hello')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });
});
