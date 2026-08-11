import { useState, useRef, useEffect } from 'react';
import type { Card, CardParallel } from '../types';
import { sortParallels } from '../lib/parallel-sort';

export interface CardRowProps {
  card: Card;
  onToggleCollected: (card: Card) => void;
  isToggling: boolean;
  parallels: CardParallel[];
  onToggleParallel: (parallel: CardParallel) => void;
  togglingParallelIds: Set<string>;
}

/** Parallels dropdown component with multi-select checkboxes */
function ParallelsDropdown({
  parallels,
  onToggleParallel,
  togglingIds,
}: {
  parallels: CardParallel[];
  onToggleParallel: (parallel: CardParallel) => void;
  togglingIds: Set<string>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sorted = sortParallels(parallels);
  const collectedCount = parallels.filter((p) => p.collected).length;
  const totalCount = parallels.length;

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (totalCount === 0) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
        aria-label={`${collectedCount} of ${totalCount} parallels collected. Click to manage parallels.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{collectedCount}/{totalCount} collected</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 right-0 w-56 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg"
          role="listbox"
          aria-label="Parallel variants"
        >
          {sorted.map((parallel) => {
            const isToggling = togglingIds.has(parallel.id);
            return (
              <button
                key={parallel.id}
                type="button"
                role="option"
                aria-selected={parallel.collected}
                disabled={isToggling}
                onClick={() => onToggleParallel(parallel)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {isToggling ? (
                  <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded border flex-shrink-0 ${
                      parallel.collected
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 dark:border-gray-500'
                    }`}
                  >
                    {parallel.collected && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                )}
                <span className="text-gray-800 dark:text-gray-200 truncate">{parallel.parallel_name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
  const baseCollected = card.collected;

  const handleBaseToggle = () => {
    if (isToggling) return;
    onToggleCollected(card);
  };

  const baseLabel = baseCollected ? 'Mark base as uncollected' : 'Mark base as collected';

  return (
    <tr
      className={`transition-colors ${
        baseCollected
          ? 'bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50'
          : 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700'
      } ${isToggling ? 'opacity-50' : ''}`}
    >
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">{card.card_number}</td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{card.set_name}</td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{card.set_card_number}</td>
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{card.player}</td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{card.team}</td>
      {/* Base collected checkbox */}
      <td className="px-3 py-3 text-center">
        <button
          type="button"
          onClick={handleBaseToggle}
          disabled={isToggling}
          aria-label={baseLabel}
          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {isToggling ? (
            <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin" aria-label="Toggling" />
          ) : baseCollected ? (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded border bg-green-500 border-green-500 text-white">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          ) : (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-500" />
          )}
        </button>
      </td>
      {/* Parallels dropdown */}
      <td className="px-3 py-3 text-center">
        <ParallelsDropdown
          parallels={parallels}
          onToggleParallel={onToggleParallel}
          togglingIds={togglingParallelIds}
        />
      </td>
    </tr>
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
  const baseCollected = card.collected;

  const handleBaseToggle = () => {
    if (isToggling) return;
    onToggleCollected(card);
  };

  const baseLabel = baseCollected ? 'Mark base as uncollected' : 'Mark base as collected';

  return (
    <div
      className={`rounded-lg border transition-colors ${
        baseCollected
          ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'
          : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
      } ${isToggling ? 'opacity-50' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
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
          </div>

          {/* Base collected toggle */}
          <button
            type="button"
            onClick={handleBaseToggle}
            disabled={isToggling}
            aria-label={baseLabel}
            className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {isToggling ? (
              <span className="inline-block w-6 h-6 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin" aria-label="Toggling" />
            ) : baseCollected ? (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded border bg-green-500 border-green-500 text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            ) : (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-500" />
            )}
          </button>
        </div>

        {/* Parallels dropdown row */}
        {parallels.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Parallels:</span>
            <ParallelsDropdown
              parallels={parallels}
              onToggleParallel={onToggleParallel}
              togglingIds={togglingParallelIds}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Combined CardRow - renders both layouts (hidden via CSS) for use in flat lists */
export function CardRow(props: CardRowProps) {
  return (
    <CardRowMobile {...props} />
  );
}
