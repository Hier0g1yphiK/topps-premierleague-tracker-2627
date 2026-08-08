import { useState } from 'react';

export interface UpdatePromptProps {
  show: boolean;
  onReload: () => void;
}

/**
 * Inline prompt displayed when a new service worker version is detected.
 * Offers the user a button to reload the app and apply the update.
 * Includes a dismiss button to hide the prompt.
 */
export function UpdatePrompt({ show, onReload }: UpdatePromptProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!show || dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="w-full bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-center gap-3 text-sm text-blue-900"
    >
      <span>A new version of the app is available.</span>
      <button
        type="button"
        onClick={onReload}
        className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors min-h-[44px] min-w-[44px]"
      >
        Reload
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss update notification"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] min-w-[44px]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}
