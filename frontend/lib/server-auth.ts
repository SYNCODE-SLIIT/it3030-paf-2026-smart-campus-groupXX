import { redirect } from 'next/navigation';

import { ApiError, getCurrentUser } from '@/lib/api-client';
import type { UserResponse } from '@/lib/api-types';
import { getUserHomePath, needsStudentOnboarding } from '@/lib/auth-routing';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface ServerAuthState {
  accessToken: string | null;
  appUser: UserResponse | null;
  isAuthenticated: boolean;
}

export async function getServerAuthState(): Promise<ServerAuthState> {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return {
        accessToken: null,
        appUser: null,
        isAuthenticated: false,
      };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        accessToken: null,
        appUser: null,
        isAuthenticated: false,
      };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token ?? null;

    if (!accessToken) {
      return {
        accessToken: null,
        appUser: null,
        isAuthenticated: false,
      };
    }

    const appUser = await getCurrentUser(accessToken);

    return {
      accessToken,
      appUser,
      isAuthenticated: true,
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return {
        accessToken: null,
        appUser: null,
        isAuthenticated: false,
      };
    }

    return {
      accessToken: null,
      appUser: null,
      isAuthenticated: false,
    };
  }
}

export async function getInitialServerAppUser() {
  try {
    const authState = await getServerAuthState();
    return authState.appUser;
  } catch {
    return null;
  }
}

export async function requireProtectedUser() {
  const authState = await getServerAuthState();

  if (!authState.isAuthenticated) {
    redirect('/login?reason=auth_required');
  }

  if (!authState.appUser) {
    redirect('/auth/logout?reason=access_denied');
  }

  if (needsStudentOnboarding(authState.appUser)) {
    redirect('/student/onboarding');
  }

  return authState.appUser;
}

export async function requireAdminUser() {
  const appUser = await requireProtectedUser();

  if (appUser.userType !== 'ADMIN') {
    redirect(getUserHomePath(appUser));
  }

  return appUser;
}

export async function requireStudentOnboardingUser() {
  const authState = await getServerAuthState();

  if (!authState.isAuthenticated) {
    redirect('/login?reason=auth_required');
  }

  if (!authState.appUser) {
    redirect('/auth/logout?reason=access_denied');
  }

  if (authState.appUser.userType !== 'STUDENT') {
    redirect(getUserHomePath(authState.appUser));
  }

  if (!needsStudentOnboarding(authState.appUser)) {
    redirect('/portal');
  }

  return authState.appUser;
}
