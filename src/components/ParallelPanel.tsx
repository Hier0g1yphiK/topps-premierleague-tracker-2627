import type { CardParallel } from '../types';
import { sortParallels } from '../lib/parallel-sort';
import { ParallelItem } from './ParallelItem';

export interface ParallelPanelProps {
  parallels: CardParallel[];
  onToggleParallel: (parallel: CardParallel) => void;
  togglingIds: Set<string>;
  isExpanded: boolean;
}

export function ParallelPanel({ parallels, onToggleParallel, togglingIds, isExpanded }: ParallelPanelProps) {
  if (!isExpanded) return null;

  const sorted = sortParallels(parallels);

  return (
    <div
      role="region"
      aria-label="Parallel variants"
      className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2"
    >
      {sorted.map((parallel) => (
        <ParallelItem
          key={parallel.id}
          parallel={parallel}
          onToggle={onToggleParallel}
          isToggling={togglingIds.has(parallel.id)}
        />
      ))}
    </div>
  );
}
