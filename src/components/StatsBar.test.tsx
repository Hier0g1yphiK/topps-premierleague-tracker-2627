import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatsBar } from './StatsBar';
import type { Card } from '../types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: crypto.randomUUID(),
    user_id: null,
    card_number: 1,
    set_name: 'Set A',
    set_card_number: '1',
    player: 'Player 1',
    team: 'Team 1',
    notes: null,
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('StatsBar', () => {
  it('displays "0 / 0 collected" and "0.0%" for empty cards array', () => {
    render(<StatsBar cards={[]} />);
    expect(screen.getByText('0 / 0 collected')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('displays correct collected count and percentage', () => {
    const cards: Card[] = [
      makeCard({ card_number: 1, collected: true }),
      makeCard({ card_number: 2, collected: false }),
      makeCard({ card_number: 3, collected: true }),
      makeCard({ card_number: 4, collected: false }),
    ];

    render(<StatsBar cards={cards} />);
    expect(screen.getByText('2 / 4 collected')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('renders a progress bar with correct aria attributes', () => {
    const cards: Card[] = [
      makeCard({ card_number: 1, collected: true }),
      makeCard({ card_number: 2, collected: false }),
    ];

    render(<StatsBar cards={cards} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays per-set breakdown with correct format', () => {
    const cards: Card[] = [
      makeCard({ card_number: 1, set_name: 'Set A', collected: true }),
      makeCard({ card_number: 2, set_name: 'Set A', collected: false }),
      makeCard({ card_number: 3, set_name: 'Set B', collected: true }),
    ];

    render(<StatsBar cards={cards} />);
    expect(screen.getByText('Set A')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('Set B')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
  });

  it('does not show per-set breakdown section when cards array is empty', () => {
    render(<StatsBar cards={[]} />);
    expect(screen.queryByText(/per-set breakdown/i)).not.toBeInTheDocument();
  });

  it('has a collapsible toggle for mobile breakdown', () => {
    const cards: Card[] = [
      makeCard({ card_number: 1, set_name: 'Set A', collected: true }),
    ];

    render(<StatsBar cards={cards} />);
    const toggle = screen.getByRole('button', { name: /per-set breakdown/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles breakdown visibility on button click', () => {
    const cards: Card[] = [
      makeCard({ card_number: 1, set_name: 'Set A', collected: true }),
    ];

    render(<StatsBar cards={cards} />);
    const toggle = screen.getByRole('button', { name: /per-set breakdown/i });

    // Initially collapsed (has 'hidden' class on mobile)
    const breakdownEl = document.getElementById('stats-breakdown');
    expect(breakdownEl).toHaveClass('hidden');

    // Click to expand
    fireEvent.click(toggle);
    expect(breakdownEl).not.toHaveClass('hidden');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // Click to collapse
    fireEvent.click(toggle);
    expect(breakdownEl).toHaveClass('hidden');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('updates stats when cards prop changes', () => {
    const cards: Card[] = [
      makeCard({ card_number: 1, collected: false }),
    ];

    const { rerender } = render(<StatsBar cards={cards} />);
    expect(screen.getByText('0 / 1 collected')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();

    // Simulate a card being collected (optimistic update)
    const updatedCards = [{ ...cards[0], collected: true }];
    rerender(<StatsBar cards={updatedCards} />);
    expect(screen.getByText('1 / 1 collected')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });
});
