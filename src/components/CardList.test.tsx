import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardList } from './CardList';
import type { Card, SortConfig } from '../types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    user_id: null,
    card_number: 1,
    set_name: 'Base',
    set_card_number: '1',
    player: 'Erling Haaland',
    team: 'Manchester City',
    notes: null,
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const defaultSortConfig: SortConfig = { column: 'card_number', direction: 'asc' };

describe('CardList', () => {
  it('renders loading spinner when isLoading is true', () => {
    render(
      <CardList
        cards={[]}
        sortConfig={defaultSortConfig}
        onSortChange={vi.fn()}
        onToggleCollected={vi.fn()}
        isLoading={true}
        togglingIds={new Set()}
      />
    );

    expect(screen.getByRole('status', { name: /loading cards/i })).toBeInTheDocument();
  });

  it('renders empty state message when no cards and no filters', () => {
    render(
      <CardList
        cards={[]}
        sortConfig={defaultSortConfig}
        onSortChange={vi.fn()}
        onToggleCollected={vi.fn()}
        isLoading={false}
        togglingIds={new Set()}
        hasActiveFilters={false}
      />
    );

    expect(screen.getByText('No cards available. Import a CSV to get started.')).toBeInTheDocument();
  });

  it('renders filter empty state when no cards but filters are active', () => {
    render(
      <CardList
        cards={[]}
        sortConfig={defaultSortConfig}
        onSortChange={vi.fn()}
        onToggleCollected={vi.fn()}
        isLoading={false}
        togglingIds={new Set()}
        hasActiveFilters={true}
      />
    );

    expect(screen.getByText('No cards match the current filters.')).toBeInTheDocument();
  });

  it('renders sortable column headers with sort indicators', () => {
    const cards = [makeCard()];
    render(
      <CardList
        cards={cards}
        sortConfig={{ column: 'card_number', direction: 'asc' }}
        onSortChange={vi.fn()}
        onToggleCollected={vi.fn()}
        isLoading={false}
        togglingIds={new Set()}
      />
    );

    // Active sort column should have ascending indicator
    const header = screen.getByRole('columnheader', { name: /# ▲/i });
    expect(header).toBeInTheDocument();
    expect(header).toHaveAttribute('aria-sort', 'ascending');
  });

  it('calls onSortChange when a column header is clicked', () => {
    const onSortChange = vi.fn();
    const cards = [makeCard()];
    render(
      <CardList
        cards={cards}
        sortConfig={defaultSortConfig}
        onSortChange={onSortChange}
        onToggleCollected={vi.fn()}
        isLoading={false}
        togglingIds={new Set()}
      />
    );

    const playerHeader = screen.getByRole('columnheader', { name: /player/i });
    fireEvent.click(playerHeader);
    expect(onSortChange).toHaveBeenCalledWith('player');
  });

  it('renders cards in the list', () => {
    const cards = [
      makeCard({ id: '1', card_number: 1, player: 'Haaland' }),
      makeCard({ id: '2', card_number: 2, player: 'Salah' }),
    ];

    render(
      <CardList
        cards={cards}
        sortConfig={defaultSortConfig}
        onSortChange={vi.fn()}
        onToggleCollected={vi.fn()}
        isLoading={false}
        togglingIds={new Set()}
      />
    );

    // Both players should appear in the DOM (desktop + mobile renders)
    expect(screen.getAllByText('Haaland').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Salah').length).toBeGreaterThan(0);
  });

  it('shows descending indicator when sort direction is desc', () => {
    const cards = [makeCard()];
    render(
      <CardList
        cards={cards}
        sortConfig={{ column: 'player', direction: 'desc' }}
        onSortChange={vi.fn()}
        onToggleCollected={vi.fn()}
        isLoading={false}
        togglingIds={new Set()}
      />
    );

    const header = screen.getByRole('columnheader', { name: /player ▼/i });
    expect(header).toHaveAttribute('aria-sort', 'descending');
  });
});
