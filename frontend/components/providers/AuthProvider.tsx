'use client';

import React from 'react';
import type { Session } from '@supabase/supabase-js';

import { getCurrentUser, getErrorMessage, syncSession } from '@/lib/api-client';
import type { UserResponse } from '@/lib/api-types';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { hasSupabasePublicEnv } from '@/lib/supabase/env';

interface AuthContextValue {
  session: Session | null;
  appUser: UserResponse | null;
  loading: boolean;
  authConfigured: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (options?: { flow?: 'invite' | 'recovery' }) => Promise<void>;
  signInWithMicrosoft: (options?: { flow?: 'invite' | 'recovery' }) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<UserResponse | null>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialAppUser,
}: {
  children: React.ReactNode;
  initialAppUser: UserResponse | null;
}) {
  const authConfigured = React.useMemo(() => hasSupabasePublicEnv(), []);
  const supabase = React.useMemo(() => {
    return getSupabaseBrowserClient();
  }, []);
  const [session, setSession] = React.useState<Session | null>(null);
  const [appUser, setAppUser] = React.useState<UserResponse | null>(initialAppUser);
  const [loading, setLoading] = React.useState(true);
  const sessionRef = React.useRef<Session | null>(null);
  const appUserRef = React.useRef<UserResponse | null>(initialAppUser);
  const hydrationTokenRef = React.useRef<string | null>(null);
  const hydrationPromiseRef = React.useRef<Promise<UserResponse | null> | null>(null);

  React.useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  React.useEffect(() => {
    appUserRef.current = appUser;
  }, [appUser]);

  const normalizeEmail = React.useCallback((value: string | null | undefined) => {
    return value?.trim().toLowerCase() ?? null;
  }, []);

  const isMissingRefreshTokenError = React.useCallback((error: unknown) => {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeError = error as { code?: string; message?: string };
    const code = maybeError.code?.toLowerCase() ?? '';
    const message = maybeError.message?.toLowerCase() ?? '';

    return code === 'refresh_token_not_found' || message.includes('refresh token not found');
  }, []);

  const getSafeSession = React.useCallback(async () => {
    if (!supabase) {
      return null;
    }

    try {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        if (isMissingRefreshTokenError(error)) {
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch {
            // Ignore cleanup failures for stale local auth artifacts.
          }
        }

        return null;
      }

      return currentSession ?? null;
    } catch (error) {
      if (isMissingRefreshTokenError(error)) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // Ignore cleanup failures for stale local auth artifacts.
        }
      }

      return null;
    }
  }, [isMissingRefreshTokenError, supabase]);

  const applyResolvedAuthState = React.useCallback((nextSession: Session | null, nextUser: UserResponse | null) => {
    setSession(nextSession);
    sessionRef.current = nextSession;
    setAppUser(nextUser);
    appUserRef.current = nextUser;
  }, []);

  const resolveAppUser = React.useCallback(
    async (nextSession: Session | null) => {
      if (!nextSession?.access_token) {
        hydrationTokenRef.current = null;
        hydrationPromiseRef.current = null;
        applyResolvedAuthState(nextSession, null);
        return null;
      }

      applyResolvedAuthState(nextSession, appUserRef.current);

      if (hydrationTokenRef.current === nextSession.access_token && hydrationPromiseRef.current) {
        return hydrationPromiseRef.current;
      }

      const accessToken = nextSession.access_token;
      const hydrationPromise = (async () => {
        try {
          const synced = await syncSession(accessToken);
          applyResolvedAuthState(nextSession, synced.user);
          return synced.user;
        } catch {
          try {
            const currentUser = await getCurrentUser(accessToken);
            applyResolvedAuthState(nextSession, currentUser);
            return currentUser;
          } catch {
            applyResolvedAuthState(nextSession, null);
            return null;
          }
        } finally {
          if (hydrationTokenRef.current === accessToken) {
            hydrationTokenRef.current = null;
            hydrationPromiseRef.current = null;
          }
        }
      })();

      hydrationTokenRef.current = accessToken;
      hydrationPromiseRef.current = hydrationPromise;

      try {
        return await hydrationPromise;
      } catch {
        applyResolvedAuthState(nextSession, null);
        return null;
      }
    },
    [applyResolvedAuthState],
  );

  React.useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const bootstrap = async () => {
      const initialSession = await getSafeSession();

      if (!mounted) {
        return;
      }

      const sameInitialUser =
        !!initialAppUser &&
        !!initialSession &&
        normalizeEmail(initialAppUser.email) === normalizeEmail(initialSession.user?.email);

      if (sameInitialUser && initialSession) {
        setSession(initialSession);
        setLoading(false);
        return;
      }

      await resolveAppUser(initialSession);

      if (mounted) {
        setLoading(false);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      React.startTransition(() => {
        if (event === 'SIGNED_OUT') {
          hydrationTokenRef.current = null;
          hydrationPromiseRef.current = null;
          applyResolvedAuthState(null, null);
          setLoading(false);
          return;
        }

        if (!nextSession) {
          hydrationTokenRef.current = null;
          hydrationPromiseRef.current = null;
          applyResolvedAuthState(null, null);
          setLoading(false);
          return;
        }

        const previousSessionUserId = sessionRef.current?.user?.id ?? null;
        const nextSessionUserId = nextSession.user?.id ?? null;

        // Token refresh for the same user does not need another backend hydration round.
        if (previousSessionUserId && previousSessionUserId === nextSessionUserId && appUserRef.current) {
          setSession(nextSession);
          sessionRef.current = nextSession;
          setLoading(false);
          return;
        }

        setLoading(true);
        void resolveAppUser(nextSession).finally(() => {
          setLoading(false);
        });
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applyResolvedAuthState, getSafeSession, initialAppUser, normalizeEmail, resolveAppUser, supabase]);

  const handleGoogleSignIn = React.useCallback(async (options?: { flow?: 'invite' | 'recovery' }) => {
    if (!supabase) {
      throw new Error(
        'Supabase authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      );
    }

    const redirectUrl = new URL('/auth/callback', window.location.origin);

    if (options?.flow === 'invite') {
      redirectUrl.searchParams.set('flow', 'invite-google');
    }
    if (options?.flow === 'recovery') {
      redirectUrl.searchParams.set('flow', 'recovery-google');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl.toString(),
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }, [supabase]);

  const handleMicrosoftSignIn = React.useCallback(async (options?: { flow?: 'invite' | 'recovery' }) => {
    if (!supabase) {
      throw new Error(
        'Supabase authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      );
    }

    const redirectUrl = new URL('/auth/callback', window.location.origin);

    if (options?.flow === 'invite') {
      redirectUrl.searchParams.set('flow', 'invite-microsoft');
    }
    if (options?.flow === 'recovery') {
      redirectUrl.searchParams.set('flow', 'recovery-microsoft');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: redirectUrl.toString(),
        scopes: 'openid profile email',
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }, [supabase]);

  const handlePasswordSignIn = React.useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        throw new Error(
          'Supabase authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        );
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    [supabase],
  );

  const handleUpdatePassword = React.useCallback(
    async (password: string) => {
      if (!supabase) {
        throw new Error(
          'Supabase authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        );
      }

      const missingSessionMessage =
        'Your secure session expired. Reopen the invite link or continue with Google/Microsoft to verify again.';
      const currentSession = await getSafeSession();

      if (currentSession?.access_token) {
        applyResolvedAuthState(currentSession, appUserRef.current);
      } else if (sessionRef.current?.access_token && sessionRef.current.refresh_token) {
        const restoredSession = sessionRef.current;
        const restored = await supabase.auth.setSession({
          access_token: restoredSession.access_token,
          refresh_token: restoredSession.refresh_token,
        });

        if (restored.error || !restored.data.session?.access_token) {
          throw new Error(missingSessionMessage);
        }

        applyResolvedAuthState(restored.data.session, appUserRef.current);
      } else {
        throw new Error(missingSessionMessage);
      }

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('auth session missing')) {
          throw new Error(missingSessionMessage);
        }
        throw new Error(error.message);
      }
    },
    [applyResolvedAuthState, getSafeSession, supabase],
  );

  const handleSignOut = React.useCallback(async () => {
    if (!supabase) {
      hydrationTokenRef.current = null;
      hydrationPromiseRef.current = null;
      applyResolvedAuthState(null, null);
      return;
    }

    const { error } = await supabase.auth.signOut();

    hydrationTokenRef.current = null;
    hydrationPromiseRef.current = null;
    applyResolvedAuthState(null, null);

    if (error) {
      throw new Error(getErrorMessage(error, 'Failed to sign out.'));
    }
  }, [applyResolvedAuthState, supabase]);

  const refreshMe = React.useCallback(async () => {
    if (!supabase) {
      hydrationTokenRef.current = null;
      hydrationPromiseRef.current = null;
      applyResolvedAuthState(null, null);
      return null;
    }

    const currentSession = await getSafeSession();

    if (!currentSession?.access_token) {
      hydrationTokenRef.current = null;
      hydrationPromiseRef.current = null;
      applyResolvedAuthState(null, null);
      return null;
    }

    return resolveAppUser(currentSession);
  }, [applyResolvedAuthState, getSafeSession, resolveAppUser, supabase]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      appUser,
      loading,
      authConfigured,
      signInWithPassword: handlePasswordSignIn,
      signInWithGoogle: handleGoogleSignIn,
      signInWithMicrosoft: handleMicrosoftSignIn,
      updatePassword: handleUpdatePassword,
      signOut: handleSignOut,
      refreshMe,
    }),
    [appUser, authConfigured, handleGoogleSignIn, handleMicrosoftSignIn, handlePasswordSignIn, handleSignOut, handleUpdatePassword, loading, refreshMe, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
