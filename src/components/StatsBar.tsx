import { useState, useMemo } from 'react';
import type { Card } from '../types';
import { computeOverallStats, computePerSetBreakdown } from '../lib/stats';

export interface StatsBarProps {
  cards: Card[];
}

export function StatsBar({ cards }: StatsBarProps) {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const stats = useMemo(() => computeOverallStats(cards), [cards]);
  const breakdown = useMemo(() => computePerSetBreakdown(cards), [cards]);

  const percentageNumber = parseFloat(stats.percentage) || 0;

  return (
    <section aria-label="Collection stats" className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Overall stats */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {stats.collected} / {stats.total} collected
        </p>
        <p className="text-sm font-semibold text-purple-700">
          {stats.percentage}
        </p>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percentageNumber}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Collection progress: ${stats.percentage}`}
      >
        <div
          className="h-full bg-purple-600 rounded-full transition-all duration-300"
          style={{ width: `${percentageNumber}%` }}
        />
      </div>

      {/* Per-set breakdown */}
      {breakdown.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-purple-700 font-medium"
            onClick={() => setIsBreakdownOpen((prev) => !prev)}
            aria-expanded={isBreakdownOpen}
            aria-controls="stats-breakdown"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isBreakdownOpen ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {isBreakdownOpen ? 'Hide' : 'Show'} per-set breakdown
          </button>

          {isBreakdownOpen && (
            <div
              id="stats-breakdown"
              className="mt-2 space-y-1"
            >
              {breakdown.map((set) => {
                const setPercentage = set.total > 0
                  ? ((set.collected / set.total) * 100).toFixed(1)
                  : '0.0';

                return (
                  <div key={set.setName} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 min-w-0 truncate flex-1">
                      {set.setName}
                    </span>
                    <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                      {set.collected}/{set.total}
                    </span>
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                      <div
                        className="h-full bg-purple-400 rounded-full"
                        style={{ width: `${setPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
