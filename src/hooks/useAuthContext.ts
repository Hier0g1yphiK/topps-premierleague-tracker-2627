import { useContext } from 'react';
import { AuthContext } from '../lib/auth-context';
import type { AuthState } from './useAuth';

export function useAuthContext(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
