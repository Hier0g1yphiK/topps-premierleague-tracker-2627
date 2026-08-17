import { AuthProvider } from './components/AuthProvider';
import { useAuthContext } from './hooks/useAuthContext';
import { LoginScreen } from './components/LoginScreen';
import { UnauthorizedScreen } from './components/UnauthorizedScreen';
import { AppShell } from './components/AppShell';

function AuthGate() {
  const { isLoading, user, isAuthorized } = useAuthContext();

  // Loading state — avoid flashing login or app content
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-purple-700 dark:text-purple-400 text-lg font-medium">
          Loading…
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <LoginScreen />;
  }

  // Signed in but unauthorized
  if (!isAuthorized) {
    return <UnauthorizedScreen />;
  }

  // Authorized — render the app
  return <AppShell />;
}

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

export default App;
