import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatsBar } from './StatsBar';
import type { Card, CardParallel } from '../types';

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

function makeParallel(overrides: Partial<CardParallel> = {}): CardParallel {
  return {
    id: crypto.randomUUID(),
    card_id: 'card-1',
    parallel_name: 'Base',
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('StatsBar', () => {
  it('displays "0 / 0 collected" and "0.0%" for empty cards array', () => {
    render(<StatsBar cards={[]} parallels={[]} />);
    expect(screen.getByText('0 / 0 collected')).toBeInTheDocument();
    // Card percentage shown in purple
    expect(screen.getByText('0.0%', { selector: '.text-purple-700' })).toBeInTheDocument();
  });

  it('displays correct collected count and percentage', () => {
    const cards: Card[] = [
      makeCard({ card_number: 1, collected: true }),
      makeCard({ card_number: 2, collected: false }),
      makeCard({ card_number: 3, collected: true }),
      makeCard({ card_number: 4, collected: false }),
    ];

    render(<StatsBar cards={cards} parallels={[]} />);
    expect(screen.getByText('2 / 4 collected')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('renders a progress bar with correct aria attributes', () => {
    const cards: Card[] = [
      makeCard({ card_number: 1, collected: true }),
      makeCard({ card_number: 2, collected: false }),
    ];

    render(<StatsBar cards={cards} parallels={[]} />);
    const progressBars = screen.getAllByRole('progressbar');
    const cardProgressBar = progressBars[0];
    expect(cardProgressBar).toHaveAttribute('aria-valuenow', '50');
    expect(cardProgressBar).toHaveAttribute('aria-valuemin', '0');
    expect(cardProgressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays per-set breakdown with correct format', () => {
    const cards: Card[] = [
      makeCard({ card_number: 1, set_name: 'Set A', collected: true }),
      makeCard({ card_number: 2, set_name: 'Set A', collected: false }),
      makeCard({ card_number: 3, set_name: 'Set B', collected: true }),
    ];

    render(<StatsBar cards={cards} parallels={[]} />);

    // Expand the breakdown first
    const toggle = screen.getByRole('button', { name: /per-set breakdown/i });
    fireEvent.click(toggle);

    expect(screen.getByText('Set A')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('Set B')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
  });

  it('does not show per-set breakdown section when cards array is empty', () => {
    render(<StatsBar cards={[]} parallels={[]} />);
    expect(screen.queryByText(/per-set breakdown/i)).not.toBeInTheDocument();
  });

  it('has a collapsible toggle for mobile breakdown', () => {
    const cards: Card[] = [
      makeCard({ card_number: 1, set_name: 'Set A', collected: true }),
    ];

    render(<StatsBar cards={cards} parallels={[]} />);
    const toggle = screen.getByRole('button', { name: /per-set breakdown/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles breakdown visibility on button click', () => {
    const cards: Card[] = [
      makeCard({ card_number: 1, set_name: 'Set A', collected: true }),
    ];

    render(<StatsBar cards={cards} parallels={[]} />);
    const toggle = screen.getByRole('button', { name: /per-set breakdown/i });

    // Initially collapsed - breakdown section not rendered
    expect(document.getElementById('stats-breakdown')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(toggle);
    expect(document.getElementById('stats-breakdown')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // Click to collapse
    fireEvent.click(toggle);
    expect(document.getElementById('stats-breakdown')).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('updates stats when cards prop changes', () => {
    const cards: Card[] = [
      makeCard({ card_number: 1, collected: false }),
    ];

    const { rerender } = render(<StatsBar cards={cards} parallels={[]} />);
    expect(screen.getByText('0 / 1 collected')).toBeInTheDocument();
    expect(screen.getByText('0.0%', { selector: '.text-purple-700' })).toBeInTheDocument();

    // Simulate a card being collected (optimistic update)
    const updatedCards = [{ ...cards[0], collected: true }];
    rerender(<StatsBar cards={updatedCards} parallels={[]} />);
    expect(screen.getByText('1 / 1 collected')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('displays parallel stats with count and percentage', () => {
    const cards: Card[] = [
      makeCard({ id: 'card-1', card_number: 1 }),
    ];
    const parallels: CardParallel[] = [
      makeParallel({ card_id: 'card-1', parallel_name: 'Base', collected: true }),
      makeParallel({ card_id: 'card-1', parallel_name: 'Blue Voltage', collected: false }),
      makeParallel({ card_id: 'card-1', parallel_name: 'Gold /50', collected: true }),
    ];

    render(<StatsBar cards={cards} parallels={parallels} />);
    expect(screen.getByText('2 / 3 parallels collected')).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument();
  });

  it('renders parallel progress bar with correct aria attributes', () => {
    const parallels: CardParallel[] = [
      makeParallel({ collected: true }),
      makeParallel({ parallel_name: 'Blue', collected: false }),
    ];

    render(<StatsBar cards={[]} parallels={parallels} />);
    const progressBars = screen.getAllByRole('progressbar');
    const parallelProgressBar = progressBars[1];
    expect(parallelProgressBar).toHaveAttribute('aria-valuenow', '50');
    expect(parallelProgressBar).toHaveAttribute('aria-valuemin', '0');
    expect(parallelProgressBar).toHaveAttribute('aria-valuemax', '100');
    expect(parallelProgressBar).toHaveAttribute('aria-label', 'Parallel progress: 50.0%');
  });

  it('displays per-set parallel counts in breakdown', () => {
    const cards: Card[] = [
      makeCard({ id: 'card-1', card_number: 1, set_name: 'Set A', collected: true }),
      makeCard({ id: 'card-2', card_number: 2, set_name: 'Set A', collected: false }),
      makeCard({ id: 'card-3', card_number: 3, set_name: 'Set B', collected: true }),
    ];
    const parallels: CardParallel[] = [
      makeParallel({ card_id: 'card-1', parallel_name: 'Base', collected: true }),
      makeParallel({ card_id: 'card-1', parallel_name: 'Blue', collected: false }),
      makeParallel({ card_id: 'card-2', parallel_name: 'Base', collected: false }),
      makeParallel({ card_id: 'card-3', parallel_name: 'Base', collected: true }),
      makeParallel({ card_id: 'card-3', parallel_name: 'Gold', collected: true }),
    ];

    render(<StatsBar cards={cards} parallels={parallels} />);

    // Expand the breakdown
    const toggle = screen.getByRole('button', { name: /per-set breakdown/i });
    fireEvent.click(toggle);

    // Check per-set parallel counts
    // Set A: 1 collected out of 3 parallels
    expect(screen.getByText('1/3')).toBeInTheDocument();
    // Set B: 2 collected out of 2 parallels
    expect(screen.getByText('2/2')).toBeInTheDocument();
  });

  it('displays "0 / 0 parallels collected" and "0.0%" for empty parallels array', () => {
    render(<StatsBar cards={[]} parallels={[]} />);
    expect(screen.getByText('0 / 0 parallels collected')).toBeInTheDocument();
  });
});
