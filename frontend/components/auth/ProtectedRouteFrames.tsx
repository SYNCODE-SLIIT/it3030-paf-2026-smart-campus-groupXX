'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { ProtectedShell } from '@/components/layout/ProtectedShell';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card, GlassPill, Skeleton } from '@/components/ui';
import type { ManagerRole, UserType } from '@/lib/api-types';
import { getUserHomePath, needsStudentOnboarding, STUDENT_ONBOARDING_PATH } from '@/lib/auth-routing';
import type { WorkspaceKind } from '@/lib/workspace';

function LoadingState({ title, message }: { title: string; message: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '32px 24px 48px',
        background: 'var(--bg)',
      }}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gap: 20 }}>
        <GlassPill
          style={{
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Secure Workspace
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--text-h)',
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-body)' }}>{message}</p>
        </GlassPill>

        <Card>
          <div style={{ display: 'grid', gap: 12 }}>
            <Skeleton variant="line" height={20} width="30%" />
            <Skeleton variant="rect" height={72} />
            <Skeleton variant="rect" height={72} />
            <Skeleton variant="rect" height={220} />
          </div>
        </Card>
      </div>
    </div>
  );
}

export function ProtectedAppFrame({
  children,
  requireAdmin = false,
  allowedUserTypes,
  allowedManagerRoles,
  workspace = 'auto',
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
  allowedUserTypes?: UserType[];
  allowedManagerRoles?: ManagerRole[];
  workspace?: WorkspaceKind;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { appUser, loading, refreshMe, session } = useAuth();
  const [isHydratingUser, setIsHydratingUser] = React.useState(false);
  const [lastHydratedSessionUserId, setLastHydratedSessionUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!session?.user?.id) {
      setLastHydratedSessionUserId(null);
      setIsHydratingUser(false);
      return;
    }

    if (loading || isHydratingUser) {
      return;
    }

    if (appUser) {
      return;
    }

    if (lastHydratedSessionUserId === session.user.id) {
      return;
    }

    setLastHydratedSessionUserId(session.user.id);
    setIsHydratingUser(true);
    void refreshMe().finally(() => setIsHydratingUser(false));
  }, [appUser, isHydratingUser, lastHydratedSessionUserId, loading, refreshMe, session]);

  const redirectTarget = React.useMemo(() => {
    if (loading || isHydratingUser) {
      return null;
    }

    if (!session) {
      return '/login';
    }

    if (!appUser) {
      return '/auth/logout?reason=access_denied';
    }

    if (needsStudentOnboarding(appUser)) {
      return STUDENT_ONBOARDING_PATH;
    }

    if (requireAdmin && appUser.userType !== 'ADMIN') {
      return getUserHomePath(appUser);
    }

    if (allowedUserTypes?.length && !allowedUserTypes.includes(appUser.userType)) {
      return getUserHomePath(appUser);
    }

    if (
      allowedManagerRoles?.length &&
      (appUser.userType !== 'MANAGER' || !appUser.managerRole || !allowedManagerRoles.includes(appUser.managerRole))
    ) {
      return getUserHomePath(appUser);
    }

    return null;
  }, [allowedManagerRoles, allowedUserTypes, appUser, isHydratingUser, loading, requireAdmin, session]);

  React.useEffect(() => {
    if (redirectTarget && redirectTarget !== pathname) {
      router.replace(redirectTarget);
    }
  }, [pathname, redirectTarget, router]);

  if (loading || isHydratingUser || redirectTarget || !appUser) {
    return (
      <LoadingState
        title="Preparing your workspace"
        message="We're validating your session and loading the role-based access area for this account."
      />
    );
  }

  return (
    <ProtectedShell user={appUser} workspace={workspace}>
      {children}
    </ProtectedShell>
  );
}

export function StudentOnboardingFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { appUser, loading, refreshMe, session } = useAuth();
  const [isHydratingUser, setIsHydratingUser] = React.useState(false);
  const [lastHydratedSessionUserId, setLastHydratedSessionUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!session?.user?.id) {
      setLastHydratedSessionUserId(null);
      setIsHydratingUser(false);
      return;
    }

    if (loading || isHydratingUser) {
      return;
    }

    if (appUser) {
      return;
    }

    if (lastHydratedSessionUserId === session.user.id) {
      return;
    }

    setLastHydratedSessionUserId(session.user.id);
    setIsHydratingUser(true);
    void refreshMe().finally(() => setIsHydratingUser(false));
  }, [appUser, isHydratingUser, lastHydratedSessionUserId, loading, refreshMe, session]);

  const redirectTarget = React.useMemo(() => {
    if (loading || isHydratingUser) {
      return null;
    }

    if (!session) {
      return '/login';
    }

    if (!appUser) {
      return '/auth/logout?reason=access_denied';
    }

    if (appUser.userType !== 'STUDENT') {
      return getUserHomePath(appUser);
    }

    if (!needsStudentOnboarding(appUser)) {
      return getUserHomePath(appUser);
    }

    return null;
  }, [appUser, isHydratingUser, loading, session]);

  React.useEffect(() => {
    if (redirectTarget && redirectTarget !== pathname) {
      router.replace(redirectTarget);
    }
  }, [pathname, redirectTarget, router]);

  if (loading || isHydratingUser || redirectTarget || !appUser) {
    return (
      <LoadingState
        title="Preparing onboarding"
        message="We're checking your invited student account before showing the onboarding form."
      />
    );
  }

  return <>{children}</>;
}
