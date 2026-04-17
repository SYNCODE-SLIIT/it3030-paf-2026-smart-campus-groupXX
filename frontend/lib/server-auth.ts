import { redirect } from 'next/navigation';

import { ApiError, getCurrentUser } from '@/lib/api-client';
import type { ManagerRole, UserResponse, UserType } from '@/lib/api-types';
import { getUserHomePath, needsStudentOnboarding, STUDENT_ONBOARDING_PATH } from '@/lib/auth-routing';
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
    redirect('/login');
  }

  if (!authState.appUser) {
    redirect('/auth/logout?reason=access_denied');
  }

  if (needsStudentOnboarding(authState.appUser)) {
    redirect(STUDENT_ONBOARDING_PATH);
  }

  return authState.appUser;
}

export async function requireUserType(allowedUserTypes: UserType[]) {
  const appUser = await requireProtectedUser();

  if (!allowedUserTypes.includes(appUser.userType)) {
    redirect(getUserHomePath(appUser));
  }

  return appUser;
}

export async function requireAdminUser() {
  return requireUserType(['ADMIN']);
}

export async function requireManagerRole(allowedManagerRoles: ManagerRole[]) {
  const appUser = await requireUserType(['MANAGER']);

  if (!appUser.managerRole || !allowedManagerRoles.includes(appUser.managerRole)) {
    redirect(getUserHomePath(appUser));
  }

  return appUser;
}

export async function requireStudentOnboardingUser() {
  const authState = await getServerAuthState();

  if (!authState.isAuthenticated) {
    redirect('/login');
  }

  if (!authState.appUser) {
    redirect('/auth/logout?reason=access_denied');
  }

  if (authState.appUser.userType !== 'STUDENT') {
    redirect(getUserHomePath(authState.appUser));
  }

  if (!needsStudentOnboarding(authState.appUser)) {
    redirect(getUserHomePath(authState.appUser));
  }

  return authState.appUser;
}
