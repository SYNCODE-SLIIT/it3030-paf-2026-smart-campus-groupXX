'use client';

import React from 'react';
import { CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { PasswordSetupCard } from '@/components/account/PasswordSetupCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Chip, Divider } from '@/components/ui';
import { getErrorMessage } from '@/lib/api-client';
import { getPostAuthRedirect, needsStudentOnboarding } from '@/lib/auth-routing';
import {
  clearInviteFlowState,
  clearPreservedInviteSession,
  isInviteExpectedEmailMatch,
  primeInviteFlowState,
  preserveInviteSession,
  readInviteFlowState,
  resolveInviteExpectedEmail,
} from '@/lib/invite-flow';
import {
  isRecoveryExpectedEmailMatch,
  primeRecoveryFlowState,
  readRecoveryFlowState,
  resolveRecoveryExpectedEmail,
} from '@/lib/recovery-flow';

type NoticeState = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

const WELCOME_PASSWORD_POLICY_HOST_ID = 'welcome-password-policy-host';
const PASSWORD_POLICY_ITEMS = [
  'At least 8 characters',
  'One uppercase letter',
  'One lowercase letter',
  'One number',
  'One special character',
];

function GoogleLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MicrosoftLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" fill="#f25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7fba00" />
      <rect x="2" y="13" width="9" height="9" fill="#00a4ef" />
      <rect x="13" y="13" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function authReasonNotice(reason: string | null, remainingAttempts: number | null, flow: 'invite' | 'recovery') {
  switch (reason) {
    case 'wrong_account':
      return {
        variant: 'error' as const,
        title: 'Wrong account selected',
        message:
          remainingAttempts && remainingAttempts > 0
            ? `Please choose the ${flow === 'recovery' ? 'recovery' : 'invited'} account. ${remainingAttempts} tries left.`
            : `Please choose the ${flow === 'recovery' ? 'recovery' : 'invited'} account.`,
      };
    case 'switch_account':
      return {
        variant: 'warning' as const,
        title: 'Switch account required',
        message: 'You are already signed in with a different account. Switch account to continue this invite.',
      };
    case 'invite_expired':
      return {
        variant: 'warning' as const,
        title: flow === 'recovery' ? 'Recovery link expired' : 'Invite link expired',
        message:
          flow === 'recovery'
            ? 'This recovery link is invalid or has expired. Request a new password reset email from the login page.'
            : 'This invite link is invalid or has expired. Ask an administrator to send a new invite email.',
      };
    case 'recovery_expired':
      return {
        variant: 'warning' as const,
        title: 'Recovery link expired',
        message: 'This recovery link is invalid or has expired. Request a new password reset email from the login page.',
      };
    case 'access_denied':
      return {
        variant: 'error' as const,
        title: 'Access denied',
        message:
          flow === 'recovery'
            ? 'This account cannot use this reset link. Request a new password reset email from the login page.'
            : 'This account cannot use this invite. Ask an administrator to send a new invite.',
      };
    case 'auth_failed':
      return {
        variant: 'error' as const,
        title: flow === 'recovery' ? 'We could not verify this reset link' : 'We could not verify this link',
        message:
          flow === 'recovery'
            ? 'This reset link may be expired or already used. Request a new password reset email from the login page.'
            : 'This invite link may be expired or already used. Ask an administrator to send a new invite.',
      };
    case 'provider_email_missing':
      return {
        variant: 'error' as const,
        title: 'Microsoft account email unavailable',
        message:
          'Microsoft did not return an email for this account. Use an account with a mailbox, or ask your admin to enable the email claim in Azure.',
      };
    case 'auth_required':
      return {
        variant: 'warning' as const,
        title: flow === 'recovery' ? 'Recovery session required' : 'Invite session required',
        message:
          flow === 'recovery'
            ? 'Your recovery session is not active. Re-open the reset link from your email.'
            : 'Your invite session is not active. Re-open the invite link from your email.',
      };
    default:
      return null;
  }
}

function StaticPasswordPolicyList() {
  return (
    <div
      style={{
        display: 'grid',
        gap: 10,
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(255,255,255,.12)',
        background: 'rgba(255,255,255,.045)',
      }}
    >
      {PASSWORD_POLICY_ITEMS.map((item) => (
        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={15} color="var(--yellow-300)" />
          <span style={{ color: 'var(--text-on-contrast-muted)', fontSize: 13, fontWeight: 600 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function AuthWelcomeSideCards({ useLivePolicy = false }: { useLivePolicy?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
      <Card variant="dark" hoverable style={{ flex: 1 }}>
        <div style={{ marginBottom: 16 }}>
          <Chip color="glass" size="sm">
            Password Policy
          </Chip>
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1.25,
            margin: '0 0 12px',
            color: 'var(--text-on-contrast)',
          }}
        >
          Protect your campus account.
        </h2>
        <p
          style={{
            margin: '0 0 18px',
            color: 'var(--text-on-contrast-muted)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          Your password must meet every rule before account activation can continue.
        </p>
        <div id={useLivePolicy ? WELCOME_PASSWORD_POLICY_HOST_ID : undefined}>
          {useLivePolicy ? null : <StaticPasswordPolicyList />}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Card hoverable>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: 96,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1,
                marginBottom: 4,
                color: 'var(--text-h)',
              }}
            >
              5<span style={{ color: 'var(--yellow-400)' }}>+</span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}
            >
              Security
              <br />
              Rules
            </div>
          </div>
        </Card>

        <Card hoverable>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: 96,
            }}
          >
            <p
              style={{
                margin: '0 0 8px',
                color: 'var(--text-body)',
                fontSize: 11,
                fontStyle: 'italic',
                fontWeight: 500,
                lineHeight: 1.6,
                opacity: 0.7,
              }}
            >
              Google and Microsoft sign-in stay available after activation.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--yellow-400)',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Auth Options
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AuthWelcomeShell({
  children,
  ariaLabel = 'Account access',
  sideContent,
}: {
  children: React.ReactNode;
  ariaLabel?: string;
  sideContent?: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '112px 24px 80px',
        }}
      >
        <section
          aria-label={ariaLabel}
          className="grid w-full grid-cols-1 md:grid-cols-12 gap-6 items-stretch"
          style={{ maxWidth: 1100 }}
        >
          <div className="col-span-1 md:col-span-7">{children}</div>
          <aside className="col-span-1 md:col-span-5 flex flex-col">
            {sideContent ?? <AuthWelcomeSideCards />}
          </aside>
        </section>
      </main>

      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          height: 6,
          background: 'var(--yellow-400)',
          zIndex: 10,
        }}
      />
    </div>
  );
}

function WelcomeStatusCard({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <AuthWelcomeShell>
      <Card hoverable>
        <div style={{ marginBottom: children ? 24 : 0 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: 0,
              color: 'var(--text-h)',
              margin: '0 0 8px',
              lineHeight: 1.15,
            }}
          >
            {title}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, lineHeight: 1.55 }}>
            {message}
          </p>
        </div>
        {children}
      </Card>
    </AuthWelcomeShell>
  );
}

function AuthWelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appUser, loading, refreshMe, session, signInWithGoogle, signInWithMicrosoft } = useAuth();
  const flow = searchParams.get('flow') === 'recovery' ? 'recovery' : 'invite';
  const isRecoveryFlow = flow === 'recovery';
  const reason = searchParams.get('reason');
  const isLinkExpired = reason === 'invite_expired' || reason === 'recovery_expired';
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
    () => authReasonNotice(reason, remainingAttempts, flow),
    [flow, reason, remainingAttempts],
  );
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = React.useState(false);
  const [notice, setNotice] = React.useState<NoticeState>(initialReasonNotice);
  const [isHydratingUser, setIsHydratingUser] = React.useState(false);
  const [isPasswordRedirecting, setIsPasswordRedirecting] = React.useState(false);
  const [lastHydratedSessionUserId, setLastHydratedSessionUserId] = React.useState<string | null>(null);
  const [inviteFlowState, setInviteFlowState] = React.useState(() => readInviteFlowState());
  const [recoveryFlowState, setRecoveryFlowState] = React.useState(() => readRecoveryFlowState());

  React.useEffect(() => {
    setNotice(initialReasonNotice);
  }, [initialReasonNotice]);

  React.useEffect(() => {
    setInviteFlowState(readInviteFlowState());
    setRecoveryFlowState(readRecoveryFlowState());
  }, [flow, reason]);

  React.useEffect(() => {
    if (isRecoveryFlow || (reason && reason !== 'switch_account')) {
      return;
    }

    const inviteEmail = resolveInviteExpectedEmail(inviteEmailHint, inviteFlowState?.expectedEmail, appUser?.email);
    if (!inviteEmail) {
      return;
    }

    setInviteFlowState(
      primeInviteFlowState(inviteEmail, {
        resetWrongAccountAttempts: Boolean(inviteEmailHint),
      }),
    );
  }, [appUser?.email, inviteEmailHint, inviteFlowState?.expectedEmail, isRecoveryFlow, reason]);

  React.useEffect(() => {
    if (!isRecoveryFlow) {
      return;
    }

    const recoveryEmail = resolveRecoveryExpectedEmail(inviteEmailHint, recoveryFlowState?.expectedEmail, appUser?.email);
    if (!recoveryEmail) {
      return;
    }

    setRecoveryFlowState(primeRecoveryFlowState(recoveryEmail));
  }, [appUser?.email, inviteEmailHint, isRecoveryFlow, recoveryFlowState?.expectedEmail]);

  const expectedInviteEmail = resolveInviteExpectedEmail(
    inviteFlowState?.expectedEmail,
    inviteEmailHint,
    appUser?.email,
  );
  const expectedRecoveryEmail = resolveRecoveryExpectedEmail(
    recoveryFlowState?.expectedEmail,
    inviteEmailHint,
    appUser?.email,
  );
  const expectedAuthEmail = isRecoveryFlow ? expectedRecoveryEmail : expectedInviteEmail;
  const mismatchedInviteSession =
    !isRecoveryFlow &&
    !!expectedInviteEmail &&
    !!session?.user?.email &&
    !isInviteExpectedEmailMatch(expectedInviteEmail, session.user.email);
  const mismatchedInviteAppUser =
    !isRecoveryFlow &&
    !!expectedInviteEmail &&
    !!appUser?.email &&
    !isInviteExpectedEmailMatch(expectedInviteEmail, appUser.email);
  const mismatchedRecoverySession =
    isRecoveryFlow &&
    !!expectedRecoveryEmail &&
    !!session?.user?.email &&
    !isRecoveryExpectedEmailMatch(expectedRecoveryEmail, session.user.email);
  const mismatchedRecoveryAppUser =
    isRecoveryFlow &&
    !!expectedRecoveryEmail &&
    !!appUser?.email &&
    !isRecoveryExpectedEmailMatch(expectedRecoveryEmail, appUser.email);
  const inviteSessionMatchesExpected =
    !isRecoveryFlow &&
    !!expectedInviteEmail &&
    !!session?.user?.email &&
    isInviteExpectedEmailMatch(expectedInviteEmail, session.user.email);
  const recoverySessionMatchesExpected =
    isRecoveryFlow &&
    !!expectedRecoveryEmail &&
    !!session?.user?.email &&
    isRecoveryExpectedEmailMatch(expectedRecoveryEmail, session.user.email);
  const shouldBlockForMismatchedInviteAppUser = mismatchedInviteAppUser && !inviteSessionMatchesExpected;
  const shouldBlockForMismatchedRecoveryAppUser = mismatchedRecoveryAppUser && !recoverySessionMatchesExpected;
  const hasWrongInviteAccountNotice = reason === 'wrong_account';
  const requiresAccountSwitch =
    !isRecoveryFlow &&
    !!session &&
    (reason === 'switch_account' ||
      (!hasWrongInviteAccountNotice && (mismatchedInviteSession || shouldBlockForMismatchedInviteAppUser)));
  const shouldHidePasswordSetup =
    !!session &&
    (requiresAccountSwitch ||
      mismatchedInviteSession ||
      shouldBlockForMismatchedInviteAppUser ||
      mismatchedRecoverySession ||
      shouldBlockForMismatchedRecoveryAppUser);
  const hasInviteContext = !!(session || expectedAuthEmail || inviteEmailHint);
  const sessionMatchesExpectedEmail =
    !!session?.user?.email &&
    (!expectedAuthEmail ||
      (isRecoveryFlow
        ? isRecoveryExpectedEmailMatch(expectedAuthEmail, session.user.email)
        : isInviteExpectedEmailMatch(expectedAuthEmail, session.user.email)));
  const shouldSuppressStaleCallbackNotice =
    sessionMatchesExpectedEmail && (reason === 'auth_failed' || reason === 'access_denied');
  const visibleNotice = shouldSuppressStaleCallbackNotice
    ? null
    : (notice ?? (requiresAccountSwitch ? authReasonNotice('switch_account', null, flow) : null));

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
    expectedAuthEmail ?? session?.user?.email ?? appUser?.email ?? (isRecoveryFlow ? 'Recovery account' : 'Invited account');

  if (loading || isHydratingUser) {
    return (
      <WelcomeStatusCard
        title="Preparing Your Access"
        message="Final checks are running before we continue to your account."
      />
    );
  }

  if (!hasInviteContext) {
    const emptyInviteTitle = isRecoveryFlow
      ? reason === 'recovery_expired' || reason === 'invite_expired'
        ? 'Recovery Link Expired'
        : 'Recovery Session Required'
      : reason === 'invite_expired'
        ? 'Invite Link Expired'
        : 'Invite Session Required';
    const emptyInviteMessage = isRecoveryFlow
      ? 'Open the password reset link from your email, or request a new reset link from the login page.'
      : reason === 'invite_expired'
        ? 'This link can no longer be used. Ask an administrator to send a new invite email.'
        : 'Open the generated invite link from your email to continue onboarding.';

    return (
      <WelcomeStatusCard title={emptyInviteTitle} message={emptyInviteMessage}>
        {visibleNotice && (
          <Alert variant={visibleNotice.variant} title={visibleNotice.title}>
            {visibleNotice.message}
          </Alert>
        )}
      </WelcomeStatusCard>
    );
  }

  const switchAccountReturnPath = (() => {
    const params = new URLSearchParams();
    if (expectedInviteEmail) {
      params.set('email', expectedInviteEmail);
    }

    const query = params.toString();
    return query ? `/auth/welcome?${query}` : '/auth/welcome';
  })();
  const shouldShowStandaloneProviderActions = !isLinkExpired && (!session || shouldHidePasswordSetup);
  const statusLabel = session
    ? isRecoveryFlow
      ? 'Recovery Link Verified'
      : 'Secure Link Verified'
    : isRecoveryFlow
      ? 'Recovery Link Ready'
      : 'Invite Link Ready';
  const heading = isRecoveryFlow ? 'Reset Password' : 'Finalize Account';
  const description = isRecoveryFlow
    ? 'Your secure recovery link is verified. Set a new password or continue with Google or Microsoft.'
    : 'Set your password to activate secure access for your invited account.';
  const canShowPasswordSetup = Boolean(session && !shouldHidePasswordSetup && !isLinkExpired);
  const providerButtonStyle: React.CSSProperties = {
    background: 'var(--neutral-900)',
    color: '#f8f8f8',
    border: '1px solid var(--neutral-700)',
    textTransform: 'none',
    letterSpacing: '0.01em',
  };

  function handleSwitchAccount() {
    setNotice({
      variant: 'info',
      title: 'Switching account',
      message: 'Signing out the current account and preparing invite sign-in...',
    });

    window.location.assign(`/auth/logout?next=${encodeURIComponent(switchAccountReturnPath)}`);
  }

  async function handleGoogleSignIn() {
    if (requiresAccountSwitch) {
      setNotice({
        variant: 'warning',
        title: 'Switch account required',
        message: 'Sign out from the current account first, then continue with the invited account.',
      });
      return;
    }

    setNotice(null);
    setIsGoogleLoading(true);

    try {
      if (isRecoveryFlow) {
        const recoveryEmail = resolveRecoveryExpectedEmail(expectedRecoveryEmail, displayEmail);
        setRecoveryFlowState(primeRecoveryFlowState(recoveryEmail));
        await signInWithGoogle({ flow: 'recovery' });
        return;
      }

      const inviteEmail = resolveInviteExpectedEmail(expectedInviteEmail, displayEmail);
      if (session?.access_token && session.refresh_token && !mismatchedInviteSession) {
        preserveInviteSession(session);
      }
      setInviteFlowState(primeInviteFlowState(inviteEmail));
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

  async function handleMicrosoftSignIn() {
    if (requiresAccountSwitch) {
      setNotice({
        variant: 'warning',
        title: 'Switch account required',
        message: 'Sign out from the current account first, then continue with the invited account.',
      });
      return;
    }

    setNotice(null);
    setIsMicrosoftLoading(true);

    try {
      if (isRecoveryFlow) {
        const recoveryEmail = resolveRecoveryExpectedEmail(expectedRecoveryEmail, displayEmail);
        setRecoveryFlowState(primeRecoveryFlowState(recoveryEmail));
        await signInWithMicrosoft({ flow: 'recovery' });
        return;
      }

      const inviteEmail = resolveInviteExpectedEmail(expectedInviteEmail, displayEmail);
      if (session?.access_token && session.refresh_token && !mismatchedInviteSession) {
        preserveInviteSession(session);
      }
      setInviteFlowState(primeInviteFlowState(inviteEmail));
      await signInWithMicrosoft({ flow: 'invite' });
    } catch (error) {
      setNotice({
        variant: 'error',
        title: 'Microsoft sign-in failed',
        message: getErrorMessage(error, 'We could not start Microsoft authentication.'),
      });
      setIsMicrosoftLoading(false);
    }
  }

  async function handlePasswordSaved() {
    setNotice({
      variant: 'info',
      title: 'Account activated',
      message: 'Redirecting you to your workspace...',
    });
    setIsPasswordRedirecting(true);

    try {
      const refreshedUser = await refreshMe();
      const resolvedUser = refreshedUser ?? appUser;

      if (!resolvedUser) {
        setNotice({
          variant: 'warning',
          title: 'Account activated',
          message: 'Password was saved, but we could not load your profile yet. Please continue with Google or Microsoft sign-in.',
        });
        return;
      }

      const nextStep = needsStudentOnboarding(resolvedUser) ? 'ONBOARDING' : 'DASHBOARD';
      const nextPath = getPostAuthRedirect(resolvedUser, nextStep);
      if (!isRecoveryFlow) {
        clearInviteFlowState();
        clearPreservedInviteSession();
      }
      router.replace(nextPath);
    } catch (error) {
      setNotice({
        variant: 'error',
        title: 'Redirect failed',
        message: getErrorMessage(error, 'Password was saved, but we could not complete the redirect.'),
      });
    } finally {
      setIsPasswordRedirecting(false);
    }
  }

  return (
    <AuthWelcomeShell
      ariaLabel={isRecoveryFlow ? 'Password recovery' : 'Invite account setup'}
      sideContent={<AuthWelcomeSideCards useLivePolicy={canShowPasswordSetup} />}
    >
      <Card hoverable>
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}
          >
            <Chip color={session ? 'green' : 'yellow'} size="md" dot>
              <ShieldCheck size={13} />
              {statusLabel}
            </Chip>
            <Chip color="neutral" size="md" style={{ maxWidth: '100%' }}>
              <Mail size={13} />
              <span
                style={{
                  display: 'inline-block',
                  maxWidth: 240,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayEmail}
              </span>
            </Chip>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: 0,
              color: 'var(--text-h)',
              margin: '0 0 8px',
              lineHeight: 1.15,
            }}
          >
            {heading}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, lineHeight: 1.55 }}>
            {description}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {visibleNotice && (
            <Alert variant={visibleNotice.variant} title={visibleNotice.title}>
              {visibleNotice.message}
            </Alert>
          )}

          {canShowPasswordSetup ? (
            <PasswordSetupCard
              compact
              title={isRecoveryFlow ? 'Set New Password' : 'Create Password'}
              description={
                isRecoveryFlow
                  ? 'Choose a new password for email sign-in, or continue below with Google or Microsoft.'
                  : 'Use an industry-standard password to protect this portal account, or continue below with Google or Microsoft.'
              }
              onPasswordSaved={handlePasswordSaved}
              policyPortalTargetId={WELCOME_PASSWORD_POLICY_HOST_ID}
              policyVisualStyle="overlay"
              submitLabel={isRecoveryFlow ? 'Update Password' : 'Activate Account'}
              showProviderActions
              providerActionsDisabled={isPasswordRedirecting}
              isGoogleLoading={isGoogleLoading}
              isMicrosoftLoading={isMicrosoftLoading}
              onGoogleSignIn={() => {
                void handleGoogleSignIn();
              }}
              onMicrosoftSignIn={() => {
                void handleMicrosoftSignIn();
              }}
            />
          ) : null}

          {!session && !visibleNotice ? (
            <Alert variant="info" title="Verify this account">
              {isRecoveryFlow
                ? 'Continue with Google or Microsoft using this email, or reopen the reset link from your email. Password setup appears after secure verification.'
                : 'Continue with Google or Microsoft using this email, or reopen the invite link from your email. Password setup appears after secure verification.'}
            </Alert>
          ) : null}

          {!appUser && session && !shouldHidePasswordSetup && !visibleNotice ? (
            <Alert variant="warning" title="Profile still loading">
              Your invite session is active, but profile sync is still running. Wait a moment, or continue with Google or Microsoft sign-in.
            </Alert>
          ) : null}

          {requiresAccountSwitch ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={isGoogleLoading || isMicrosoftLoading || isPasswordRedirecting}
              onClick={handleSwitchAccount}
            >
              Switch Account
            </Button>
          ) : null}

          {shouldShowStandaloneProviderActions ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Divider label="OR SIGN IN WITH" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <Button
                  variant="subtle"
                  size="lg"
                  fullWidth
                  loading={isGoogleLoading}
                  disabled={isMicrosoftLoading || isPasswordRedirecting || requiresAccountSwitch}
                  iconLeft={<GoogleLogo size={18} />}
                  onClick={() => {
                    void handleGoogleSignIn();
                  }}
                  style={providerButtonStyle}
                >
                  Google
                </Button>
                <Button
                  variant="subtle"
                  size="lg"
                  fullWidth
                  loading={isMicrosoftLoading}
                  disabled={isGoogleLoading || isPasswordRedirecting || requiresAccountSwitch}
                  iconLeft={<MicrosoftLogo size={18} />}
                  onClick={() => {
                    void handleMicrosoftSignIn();
                  }}
                  style={providerButtonStyle}
                >
                  Microsoft
                </Button>
              </div>

              <p style={{ margin: 0, textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: 'var(--text-muted)' }}>
                By continuing, you agree to our{' '}
                <a href="#" style={{ color: 'var(--yellow-600)', textDecoration: 'none' }}>
                  Institutional Security Terms
                </a>{' '}
                and{' '}
                <a href="#" style={{ color: 'var(--yellow-600)', textDecoration: 'none' }}>
                  Data Governance Policy
                </a>
                .
              </p>
            </div>
          ) : null}
        </div>
      </Card>
    </AuthWelcomeShell>
  );
}

function AuthWelcomeFallback() {
  return (
    <WelcomeStatusCard
      title="Preparing Your Access"
      message="Final checks are running before we continue to your account."
    />
  );
}

export default function AuthWelcomePage() {
  return (
    <React.Suspense fallback={<AuthWelcomeFallback />}>
      <AuthWelcomeContent />
    </React.Suspense>
  );
}
