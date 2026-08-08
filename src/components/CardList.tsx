import type { Card, SortConfig, SortColumn } from '../types';
import { CardRowDesktop, CardRowMobile } from './CardRow';

export interface CardListProps {
  cards: Card[];
  sortConfig: SortConfig;
  onSortChange: (column: SortColumn) => void;
  onToggleCollected: (card: Card) => void;
  isLoading: boolean;
  togglingIds: Set<string>;
  hasActiveFilters?: boolean;
}

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'card_number', label: '#' },
  { key: 'set_name', label: 'Set' },
  { key: 'set_card_number', label: 'Set #' },
  { key: 'player', label: 'Player' },
  { key: 'team', label: 'Team' },
  { key: 'collected', label: 'Status' },
];

function SortIndicator({ column, sortConfig }: { column: SortColumn; sortConfig: SortConfig }) {
  if (sortConfig.column !== column) {
    return <span className="ml-1 text-gray-300">⇅</span>;
  }
  return (
    <span className="ml-1 text-purple-600">
      {sortConfig.direction === 'asc' ? '▲' : '▼'}
    </span>
  );
}

export function CardList({
  cards,
  sortConfig,
  onSortChange,
  onToggleCollected,
  isLoading,
  togglingIds,
  hasActiveFilters = false,
}: CardListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Loading cards">
        <span className="inline-block w-8 h-8 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Loading cards...</span>
      </div>
    );
  }

  // Empty state
  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {hasActiveFilters
            ? 'No cards match the current filters.'
            : 'No cards available. Import a CSV to get started.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop table (≥768px) */}
      <table className="hidden md:table w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => onSortChange(col.key)}
                aria-sort={
                  sortConfig.column === col.key
                    ? sortConfig.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                role="columnheader"
              >
                <span className="inline-flex items-center">
                  {col.label}
                  <SortIndicator column={col.key} sortConfig={sortConfig} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {cards.map((card) => (
            <CardRowDesktop
              key={card.id}
              card={card}
              onToggleCollected={onToggleCollected}
              isToggling={togglingIds.has(card.id)}
            />
          ))}
        </tbody>
      </table>

      {/* Mobile stacked cards (<768px) */}
      <div className="md:hidden flex flex-col gap-2">
        {cards.map((card) => (
          <CardRowMobile
            key={card.id}
            card={card}
            onToggleCollected={onToggleCollected}
            isToggling={togglingIds.has(card.id)}
          />
        ))}
      </div>
    </div>
  );
}
