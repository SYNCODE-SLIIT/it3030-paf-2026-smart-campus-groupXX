'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { PasswordSetupCard } from '@/components/account/PasswordSetupCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Input } from '@/components/ui';
import { getErrorMessage } from '@/lib/api-client';
import {
  isInviteFlowEmailMatch,
  primeInviteFlowState,
  readInviteFlowState,
} from '@/lib/invite-flow';

function inviteReasonNotice(reason: string | null, remainingAttempts: number | null) {
  switch (reason) {
    case 'wrong_account':
      return {
        variant: 'error' as const,
        title: 'Wrong Google account',
        message:
          remainingAttempts && remainingAttempts > 0
            ? `Please choose the invited Google account. ${remainingAttempts} tries left.`
            : 'Please choose the invited Google account.',
      };
    case 'invite_expired':
      return {
        variant: 'warning' as const,
        title: 'Invite expired',
        message: 'Too many wrong account tries. Open the invite link again.',
      };
    case 'access_denied':
      return {
        variant: 'error' as const,
        title: 'Access denied',
        message: 'This account cannot use this invite.',
      };
    case 'auth_failed':
      return {
        variant: 'error' as const,
        title: 'Invite validation failed',
        message: 'The invite callback could not be completed. Please open the invite link again.',
      };
    case 'auth_required':
      return {
        variant: 'warning' as const,
        title: 'Invite session required',
        message: 'Your invite session is not active. Re-open the invite link from your email.',
      };
    default:
      return null;
  }
}

function AuthWelcomeContent() {
  const searchParams = useSearchParams();
  const { appUser, loading, refreshMe, session, signInWithGoogle } = useAuth();
  const reason = searchParams.get('reason');
  const inviteEmailHint = searchParams.get('email');
  const remainingAttempts = React.useMemo(() => {
    const value = searchParams.get('remaining');
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);
  const initialReasonNotice = React.useMemo(
    () => inviteReasonNotice(reason, remainingAttempts),
    [reason, remainingAttempts],
  );
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [notice, setNotice] = React.useState<{
    variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
    title: string;
    message: string;
  } | null>(initialReasonNotice);
  const [isHydratingUser, setIsHydratingUser] = React.useState(false);
  const [lastHydratedSessionUserId, setLastHydratedSessionUserId] = React.useState<string | null>(null);
  const [inviteFlowState, setInviteFlowState] = React.useState(() => readInviteFlowState());

  React.useEffect(() => {
    setNotice(initialReasonNotice);
  }, [initialReasonNotice]);

  React.useEffect(() => {
    setInviteFlowState(readInviteFlowState());
  }, [reason]);

  React.useEffect(() => {
    if (reason) {
      return;
    }

    const inviteEmail = appUser?.email ?? session?.user?.email ?? inviteEmailHint ?? null;
    if (!inviteEmail) {
      return;
    }

    setInviteFlowState(primeInviteFlowState(inviteEmail));
  }, [appUser?.email, inviteEmailHint, reason, session?.user?.email]);

  const hasInviteRetryState = !!inviteFlowState;
  const mismatchedInviteSession = !isInviteFlowEmailMatch(inviteFlowState, session?.user?.email);
  const shouldHidePasswordSetup = !!session && hasInviteRetryState && mismatchedInviteSession;
  const hasInviteContext = !!(session || inviteFlowState?.expectedEmail || inviteEmailHint);

  React.useEffect(() => {
    if (loading || !session?.user?.id) {
      if (!session?.user?.id) {
        setLastHydratedSessionUserId(null);
        setIsHydratingUser(false);
      }
      return;
    }

    if (appUser || isHydratingUser || lastHydratedSessionUserId === session.user.id) {
      return;
    }

    setLastHydratedSessionUserId(session.user.id);
    setIsHydratingUser(true);
    void refreshMe().finally(() => setIsHydratingUser(false));
  }, [appUser, isHydratingUser, lastHydratedSessionUserId, loading, refreshMe, session]);

  const displayEmail =
    inviteFlowState?.expectedEmail ?? inviteEmailHint ?? session?.user?.email ?? appUser?.email ?? 'Invited account';

  if (loading || isHydratingUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background:
            'radial-gradient(circle at top left, rgba(238,202,68,.18), transparent 28%), linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg) 100%)',
        }}
      >
        <Card style={{ width: '100%', maxWidth: 620 }}>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--text-h)',
            }}
          >
            Preparing your invited access
          </p>
          <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body)' }}>
            Final checks are running before we continue to your account.
          </p>
        </Card>
      </div>
    );
  }

  if (!hasInviteContext) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background:
            'radial-gradient(circle at top left, rgba(238,202,68,.18), transparent 28%), linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg) 100%)',
        }}
      >
        <Card style={{ width: '100%', maxWidth: 620 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--text-h)',
              }}
            >
              Invite session required
            </p>
            {notice && (
              <Alert variant={notice.variant} title={notice.title}>
                {notice.message}
              </Alert>
            )}
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-body)' }}>
              Open the generated invite link from your email to continue onboarding.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  async function handleGoogleSignIn() {
    setNotice(null);
    setIsGoogleLoading(true);

    try {
      setInviteFlowState(primeInviteFlowState(displayEmail));
      await signInWithGoogle({ flow: 'invite' });
    } catch (error) {
      setNotice({
        variant: 'error',
        title: 'Google sign-in failed',
        message: getErrorMessage(error, 'We could not start Google authentication.'),
      });
      setIsGoogleLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background:
          'radial-gradient(circle at top left, rgba(238,202,68,.18), transparent 28%), linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg) 100%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 760, display: 'grid', gap: 14 }}>
        <Card>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: 'var(--text-h)',
                }}
              >
                Complete invited account setup
              </p>
              <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body)' }}>
                This invite is locked to one email. Use the invited account below to continue.
              </p>
            </div>

            <Input label="Invited Email" value={displayEmail} readOnly disabled />

            {session && !shouldHidePasswordSetup ? (
              <PasswordSetupCard
                compact
                title="Set your password"
                description="Set a password for future email sign-in with this invited account."
              />
            ) : null}

            {notice && (
              <Alert variant={notice.variant} title={notice.title}>
                {notice.message}
              </Alert>
            )}

            {!session ? (
              <Alert variant="info" title="Invite ready">
                Continue with Google sign-in below. Password setup will appear once the invite session finishes loading.
              </Alert>
            ) : null}

            {!appUser && session && !shouldHidePasswordSetup && (
              <Alert variant="warning" title="Profile still loading">
                Your invite session is active, but profile sync is still in progress. Wait a moment, or use Google sign-in to continue.
              </Alert>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Button
                variant="subtle"
                size="sm"
                loading={isGoogleLoading}
                iconLeft={<ShieldCheck size={14} />}
                onClick={() => {
                  void handleGoogleSignIn();
                }}
              >
                Sign in with Google
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AuthWelcomeFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background:
          'radial-gradient(circle at top left, rgba(238,202,68,.18), transparent 28%), linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg) 100%)',
      }}
    >
      <Card style={{ width: '100%', maxWidth: 620 }}>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--text-h)',
          }}
        >
          Preparing your invited access
        </p>
        <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body)' }}>
          Final checks are running before we continue to your account.
        </p>
      </Card>
    </div>
  );
}

export default function AuthWelcomePage() {
  return (
    <React.Suspense fallback={<AuthWelcomeFallback />}>
      <AuthWelcomeContent />
    </React.Suspense>
  );
}
