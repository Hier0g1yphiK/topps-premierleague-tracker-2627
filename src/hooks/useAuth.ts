import { useState, useEffect, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthorized: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL;

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const isAuthorized = !!user && !!ALLOWED_EMAIL && user.email === ALLOWED_EMAIL;

  // If signed in but not authorized, sign them out
  useEffect(() => {
    if (!isLoading && user && !isAuthorized) {
      // Don't sign out immediately — let the UI show the unauthorized message.
      // The user will see the message and can't access the app.
    }
  }, [isLoading, user, isAuthorized]);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    session,
    user,
    isLoading,
    isAuthorized,
    signInWithGoogle,
    signOut,
  };
}
