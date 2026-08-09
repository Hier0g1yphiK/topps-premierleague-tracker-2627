import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ParallelPanel } from './ParallelPanel';
import type { CardParallel } from '../types';

function makeParallel(overrides: Partial<CardParallel> = {}): CardParallel {
  return {
    id: 'p-1',
    card_id: 'c-1',
    parallel_name: 'Base',
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ParallelPanel', () => {
  it('returns null when isExpanded is false', () => {
    const { container } = render(
      <ParallelPanel
        parallels={[makeParallel()]}
        onToggleParallel={vi.fn()}
        togglingIds={new Set()}
        isExpanded={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders content when isExpanded is true', () => {
    render(
      <ParallelPanel
        parallels={[makeParallel()]}
        onToggleParallel={vi.fn()}
        togglingIds={new Set()}
        isExpanded={true}
      />
    );

    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('has role="region" with aria-label "Parallel variants"', () => {
    render(
      <ParallelPanel
        parallels={[makeParallel()]}
        onToggleParallel={vi.fn()}
        togglingIds={new Set()}
        isExpanded={true}
      />
    );

    const region = screen.getByRole('region', { name: 'Parallel variants' });
    expect(region).toBeInTheDocument();
  });

  it('sorts parallels correctly (collected first, then alphabetical)', () => {
    const parallels = [
      makeParallel({ id: 'p-1', parallel_name: 'Zebra', collected: false }),
      makeParallel({ id: 'p-2', parallel_name: 'Alpha', collected: true }),
      makeParallel({ id: 'p-3', parallel_name: 'Base', collected: false }),
      makeParallel({ id: 'p-4', parallel_name: 'Gold', collected: true }),
    ];

    render(
      <ParallelPanel
        parallels={parallels}
        onToggleParallel={vi.fn()}
        togglingIds={new Set()}
        isExpanded={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((btn) => btn.getAttribute('aria-label'));

    // Collected first (Alpha, Gold alphabetical), then uncollected (Base, Zebra alphabetical)
    expect(labels).toEqual([
      'Toggle Alpha collected',
      'Toggle Gold collected',
      'Toggle Base collected',
      'Toggle Zebra collected',
    ]);
  });

  it('passes correct isToggling prop to each ParallelItem', () => {
    const parallels = [
      makeParallel({ id: 'p-1', parallel_name: 'Base', collected: true }),
      makeParallel({ id: 'p-2', parallel_name: 'Gold', collected: false }),
    ];

    render(
      <ParallelPanel
        parallels={parallels}
        onToggleParallel={vi.fn()}
        togglingIds={new Set(['p-2'])}
        isExpanded={true}
      />
    );

    // The toggling item (p-2 = Gold) should have a disabled button
    const goldButton = screen.getByRole('button', { name: 'Toggle Gold collected' });
    expect(goldButton).toBeDisabled();

    // The non-toggling item (p-1 = Base) should not be disabled
    const baseButton = screen.getByRole('button', { name: 'Toggle Base collected' });
    expect(baseButton).not.toBeDisabled();
  });
});
