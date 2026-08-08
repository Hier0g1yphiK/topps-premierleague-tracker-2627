import type { Card } from '../types';

export interface CardRowProps {
  card: Card;
  onToggleCollected: (card: Card) => void;
  isToggling: boolean;
}

/** Desktop table row variant (rendered inside <tbody>) */
export function CardRowDesktop({ card, onToggleCollected, isToggling }: CardRowProps) {
  const handleToggle = () => {
    if (!isToggling) {
      onToggleCollected(card);
    }
  };

  const statusLabel = card.collected ? 'Mark as uncollected' : 'Mark as collected';

  return (
    <tr
      className={`cursor-pointer transition-colors ${
        card.collected
          ? 'bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50'
          : 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700'
      } ${isToggling ? 'opacity-50' : ''}`}
      onClick={handleToggle}
      role="button"
      aria-label={statusLabel}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
    >
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">{card.card_number}</td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{card.set_name}</td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{card.set_card_number}</td>
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{card.player}</td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{card.team}</td>
      <td className="px-4 py-3 text-sm text-center">
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
      </td>
    </tr>
  );
}

/** Mobile stacked card variant */
export function CardRowMobile({ card, onToggleCollected, isToggling }: CardRowProps) {
  const handleToggle = () => {
    if (!isToggling) {
      onToggleCollected(card);
    }
  };

  const statusLabel = card.collected ? 'Mark as uncollected' : 'Mark as collected';

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        card.collected
          ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'
          : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
      } ${isToggling ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
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
        <button
          type="button"
          onClick={handleToggle}
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
  );
}

/** Combined CardRow - renders both layouts (hidden via CSS) for use in flat lists */
export function CardRow({ card, onToggleCollected, isToggling }: CardRowProps) {
  return (
    <CardRowMobile card={card} onToggleCollected={onToggleCollected} isToggling={isToggling} />
  );
}
