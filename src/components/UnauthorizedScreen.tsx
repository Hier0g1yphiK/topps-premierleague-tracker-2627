import { useAuthContext } from '../hooks/useAuthContext';

export function UnauthorizedScreen() {
  const { user, signOut } = useAuthContext();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-purple-700 dark:text-purple-400">
            Premier League Card Tracker
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            2026/27 Season
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
          <p className="text-red-700 dark:text-red-400 font-medium">
            You're not authorized to access this app.
          </p>
          <p className="text-red-600 dark:text-red-500 text-sm">
            Signed in as {user?.email}
          </p>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
