import { useState } from 'react';
import type { Card, CardParallel } from '../types';
import { ParallelPanel } from './ParallelPanel';

export interface CardRowProps {
  card: Card;
  onToggleCollected: (card: Card) => void;
  isToggling: boolean;
  parallels: CardParallel[];
  onToggleParallel: (parallel: CardParallel) => void;
  togglingParallelIds: Set<string>;
}

/** Chevron SVG icon that rotates when expanded */
function ChevronIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

/** Find the "Base" parallel for card-level toggle delegation */
function findBaseParallel(parallels: CardParallel[]): CardParallel | undefined {
  return parallels.find((p) => p.parallel_name === 'Base');
}

/** Desktop table row variant (rendered inside <tbody>) */
export function CardRowDesktop({
  card,
  onToggleCollected,
  isToggling,
  parallels,
  onToggleParallel,
  togglingParallelIds,
}: CardRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCardToggle = () => {
    if (isToggling) return;
    const baseParallel = findBaseParallel(parallels);
    if (baseParallel) {
      onToggleParallel(baseParallel);
    } else {
      onToggleCollected(card);
    }
  };

  const handleExpandToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const collectedCount = parallels.filter((p) => p.collected).length;
  const totalCount = parallels.length;
  const statusLabel = card.collected ? 'Mark as uncollected' : 'Mark as collected';

  return (
    <>
      <tr
        className={`transition-colors ${
          card.collected
            ? 'bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50'
            : 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700'
        } ${isToggling ? 'opacity-50' : ''}`}
      >
        {/* Expand/collapse column */}
        <td className="px-2 py-3 text-center">
          <button
            type="button"
            onClick={handleExpandToggle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleExpandToggle();
              }
            }}
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label={isExpanded ? 'Collapse parallels' : 'Expand parallels'}
            aria-expanded={isExpanded}
          >
            <ChevronIcon isExpanded={isExpanded} />
          </button>
        </td>
        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">{card.card_number}</td>
        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{card.set_name}</td>
        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{card.set_card_number}</td>
        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{card.player}</td>
        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{card.team}</td>
        {/* Parallel count indicator */}
        <td className="px-3 py-3 text-sm text-center">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {collectedCount}/{totalCount}
          </span>
        </td>
        {/* Card-level collected status toggle */}
        <td className="px-4 py-3 text-sm text-center">
          <button
            type="button"
            onClick={handleCardToggle}
            disabled={isToggling}
            aria-label={statusLabel}
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {isToggling ? (
              <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin" aria-label="Toggling" />
            ) : card.collected ? (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white" aria-label="Collected">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            ) : (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-gray-300" aria-label="Not collected" />
            )}
          </button>
        </td>
      </tr>
      {/* Expanded parallel panel row */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="p-0">
            <ParallelPanel
              parallels={parallels}
              onToggleParallel={onToggleParallel}
              togglingIds={togglingParallelIds}
              isExpanded={isExpanded}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/** Mobile stacked card variant */
export function CardRowMobile({
  card,
  onToggleCollected,
  isToggling,
  parallels,
  onToggleParallel,
  togglingParallelIds,
}: CardRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCardToggle = () => {
    if (isToggling) return;
    const baseParallel = findBaseParallel(parallels);
    if (baseParallel) {
      onToggleParallel(baseParallel);
    } else {
      onToggleCollected(card);
    }
  };

  const handleExpandToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const collectedCount = parallels.filter((p) => p.collected).length;
  const totalCount = parallels.length;
  const statusLabel = card.collected ? 'Mark as uncollected' : 'Mark as collected';

  return (
    <div
      className={`rounded-lg border transition-colors ${
        card.collected
          ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'
          : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
      } ${isToggling ? 'opacity-50' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          {/* Expand/collapse chevron */}
          <button
            type="button"
            onClick={handleExpandToggle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleExpandToggle();
              }
            }}
            className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label={isExpanded ? 'Collapse parallels' : 'Expand parallels'}
            aria-expanded={isExpanded}
          >
            <ChevronIcon isExpanded={isExpanded} />
          </button>

          {/* Card info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              #{card.card_number} — {card.player}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              {card.team}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {card.set_name} · #{card.set_card_number}
            </p>
            {/* Parallel count indicator */}
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
              Parallels: {collectedCount}/{totalCount}
            </p>
          </div>

          {/* Card-level collected toggle */}
          <button
            type="button"
            onClick={handleCardToggle}
            disabled={isToggling}
            aria-label={statusLabel}
            className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {isToggling ? (
              <span className="inline-block w-6 h-6 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin" aria-label="Toggling" />
            ) : card.collected ? (
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            ) : (
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-gray-300" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded parallel panel */}
      {isExpanded && (
        <ParallelPanel
          parallels={parallels}
          onToggleParallel={onToggleParallel}
          togglingIds={togglingParallelIds}
          isExpanded={isExpanded}
        />
      )}
    </div>
  );
}

/** Combined CardRow - renders both layouts (hidden via CSS) for use in flat lists */
export function CardRow(props: CardRowProps) {
  return (
    <CardRowMobile {...props} />
  );
}
