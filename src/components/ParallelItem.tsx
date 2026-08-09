import type { CardParallel } from '../types';

export interface ParallelItemProps {
  parallel: CardParallel;
  onToggle: (parallel: CardParallel) => void;
  isToggling: boolean;
}

export function ParallelItem({ parallel, onToggle, isToggling }: ParallelItemProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-1">
      <button
        type="button"
        onClick={() => onToggle(parallel)}
        disabled={isToggling}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
        aria-label={`Toggle ${parallel.parallel_name} collected`}
      >
        {isToggling ? (
          <span
            className="inline-block w-5 h-5 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin dark:border-gray-600 dark:border-t-purple-400"
            aria-label="Toggling"
          />
        ) : parallel.collected ? (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white dark:bg-green-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        ) : (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-500" />
        )}
      </button>
      <span className="text-sm text-gray-800 dark:text-gray-200">{parallel.parallel_name}</span>
    </div>
  );
}
