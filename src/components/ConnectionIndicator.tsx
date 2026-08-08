export interface ConnectionIndicatorProps {
  status: 'connected' | 'reconnecting' | 'disconnected';
  onRetry: () => void;
}

/**
 * Small connection state indicator showing connected, reconnecting, or disconnected status.
 * Displays a manual retry button in the disconnected state.
 */
export function ConnectionIndicator({ status, onRetry }: ConnectionIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm" aria-label="Connection status">
      {status === 'connected' && (
        <>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden="true" />
          <span className="text-green-700">Connected</span>
        </>
      )}

      {status === 'reconnecting' && (
        <>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500 animate-pulse" aria-hidden="true" />
          <span className="text-yellow-700">Reconnecting...</span>
        </>
      )}

      {status === 'disconnected' && (
        <>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
          <span className="text-red-700">Disconnected</span>
          <button
            type="button"
            onClick={onRetry}
            className="ml-2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            aria-label="Retry connection"
          >
            Retry
          </button>
        </>
      )}
    </div>
  );
}
