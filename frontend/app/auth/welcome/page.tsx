'use client';

import React from 'react';
import { Mail, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { PasswordSetupCard } from '@/components/account/PasswordSetupCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Input } from '@/components/ui';
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
        message: flow === 'recovery'
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
        message: flow === 'recovery'
          ? 'Your recovery session is not active. Re-open the reset link from your email.'
          : 'Your invite session is not active. Re-open the invite link from your email.',
      };
    default:
      return null;
  }
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

  const displayEmail = expectedAuthEmail ?? session?.user?.email ?? appUser?.email ?? (
    isRecoveryFlow ? 'Recovery account' : 'Invited account'
  );

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
    const emptyInviteTitle = isRecoveryFlow
      ? reason === 'recovery_expired' || reason === 'invite_expired'
        ? 'Recovery link expired'
        : 'Recovery session required'
      : reason === 'invite_expired'
        ? 'Invite link expired'
        : 'Invite session required';
    const emptyInviteMessage = isRecoveryFlow
      ? 'Open the password reset link from your email, or request a new reset link from the login page.'
      : reason === 'invite_expired'
        ? 'This link can no longer be used. Ask an administrator to send a new invite email.'
        : 'Open the generated invite link from your email to continue onboarding.';

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
              {emptyInviteTitle}
            </p>
            {visibleNotice && (
              <Alert variant={visibleNotice.variant} title={visibleNotice.title}>
                {visibleNotice.message}
              </Alert>
            )}
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-body)' }}>
              {emptyInviteMessage}
            </p>
          </div>
        </Card>
      </div>
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
    <div className="welcome-page">
      <div aria-hidden="true" className="welcome-page-glow welcome-page-glow-left" />
      <div aria-hidden="true" className="welcome-page-glow welcome-page-glow-right" />
      <style>{`
        .welcome-page {
          min-height: 100dvh;
          position: relative;
          padding: clamp(6px, 1.1vw, 14px);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-x: hidden;
          overflow-y: auto;
          background:
            radial-gradient(circle at 8% 10%, rgba(238,202,68,.14), transparent 30%),
            radial-gradient(circle at 92% 92%, rgba(70,66,55,.32), transparent 28%),
            linear-gradient(180deg, #121212 0%, #161514 100%);
        }
        .welcome-page-glow {
          position: absolute;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          pointer-events: none;
        }
        .welcome-page-glow-left {
          inset: 10% auto auto 6%;
          background: rgba(238,202,68,.11);
          filter: blur(92px);
        }
        .welcome-page-glow-right {
          inset: auto 3% 8% auto;
          background: rgba(72,68,60,.35);
          filter: blur(100px);
        }
        .welcome-auth-frame {
          width: min(100%, 1000px);
          display: grid;
          grid-template-columns: minmax(310px, .95fr) minmax(410px, 1.05fr);
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(14,14,14,.72);
          backdrop-filter: blur(14px) saturate(1.2);
          -webkit-backdrop-filter: blur(14px) saturate(1.2);
          box-shadow: 0 18px 42px rgba(0,0,0,.46);
          position: relative;
          z-index: 1;
          height: clamp(560px, 70vh, 640px);
          max-height: min(640px, calc(100dvh - 26px));
          min-height: min(540px, calc(100dvh - 26px));
        }
        .welcome-auth-media {
          position: relative;
          min-height: 100%;
          background-image: linear-gradient(to top, rgba(9,9,9,.84), rgba(9,9,9,.26)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuDnT0tV9Fe6bH-VywONGR08nUjMNWDUoxZhHI3B6CeJRXPS2uxlKuQ560IzVfcbO7s5eUpOX9msH72XJXKRrtHfdmI7MiroC0h-67ya4UyqsYiiKOsFFawAra6W-lgsN0pN_vNgc8xDKq1uXJujhtN0L2re700rN27pO1EMIG0qi3cArdjq2gyGgHKCkAaDdt6Q1uSwlokgufna7MbKiQ31-hTMwBnOhaNQBL6RJbKbtrJ6yj_8RFyX3TP_-7qV_Wqonz1sWnOjIgI");
          background-size: cover;
          background-position: center;
          filter: grayscale(.1) contrast(1.05);
        }
        .welcome-auth-media-copy {
          position: absolute;
          left: 26px;
          right: 26px;
          bottom: 22px;
          display: grid;
          gap: 10px;
        }
        .welcome-auth-media-policy-shell {
          width: min(100%, 370px);
          display: flex;
        }
        .welcome-auth-media-policy-host {
          width: 100%;
        }
        .welcome-auth-media-copy h2 {
          margin: 0;
          font-family: var(--font-display);
          font-size: clamp(28px, 3vw, 42px);
          line-height: 1.07;
          font-weight: 900;
          color: var(--yellow-400);
        }
        .welcome-auth-media-copy p {
          margin: 0;
          font-size: 14px;
          line-height: 1.55;
          color: rgba(255,255,255,.8);
          max-width: 420px;
        }
        .welcome-auth-panel {
          padding: clamp(12px, 1.9vw, 24px);
          display: grid;
          gap: 10px;
          align-content: start;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .welcome-auth-panel::-webkit-scrollbar {
          width: 9px;
        }
        .welcome-auth-panel::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.12);
          border-radius: 999px;
        }
        .welcome-banner {
          border: 1px solid rgba(177,207,167,.3);
          background: rgba(177,207,167,.18);
          border-radius: 12px;
          padding: 10px 12px;
          display: flex;
          gap: 8px;
          align-items: center;
          color: #bddbb4;
          font-family: var(--font-display);
          font-size: 10px;
          letter-spacing: .07em;
          text-transform: uppercase;
          font-weight: 800;
        }
        .welcome-banner.warning {
          border-color: rgba(238,202,68,.3);
          background: rgba(238,202,68,.12);
          color: var(--yellow-300);
        }
        .welcome-heading {
          display: grid;
          gap: 8px;
        }
        .welcome-heading h1 {
          margin: 0;
          font-family: var(--font-display);
          font-size: clamp(22px, 2.2vw, 42px);
          font-weight: 900;
          line-height: 1.05;
          color: var(--text-h);
        }
        .welcome-heading p {
          margin: 0;
          color: var(--text-muted);
          font-size: 13.5px;
          line-height: 1.5;
        }
        .welcome-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 4px 0 0;
        }
        .welcome-divider span {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,.08);
        }
        .welcome-divider p {
          margin: 0;
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 8px;
          letter-spacing: .22em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .welcome-terms {
          margin: 0;
          text-align: center;
          font-size: 10.5px;
          line-height: 1.45;
          color: color-mix(in srgb, var(--text-muted) 78%, transparent);
        }
        .welcome-terms a {
          color: var(--yellow-300);
          text-decoration: none;
        }
        .welcome-terms a:hover {
          text-decoration: underline;
        }
        .welcome-auth-actions {
          display: grid;
          gap: 8px;
        }
        .welcome-auth-provider-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @media (prefers-color-scheme: light) {
          .welcome-page {
            background:
              radial-gradient(circle at 8% 10%, rgba(238,202,68,.18), transparent 32%),
              radial-gradient(circle at 92% 92%, rgba(171,167,156,.2), transparent 30%),
              linear-gradient(180deg, #f8f6f0 0%, #f3f1ea 100%);
          }
          .welcome-page-glow-left {
            background: rgba(238,202,68,.14);
          }
          .welcome-page-glow-right {
            background: rgba(126,123,114,.24);
          }
          .welcome-auth-frame {
            border: 1px solid rgba(20,18,12,.08);
            background: rgba(255,255,255,.86);
            box-shadow: 0 16px 38px rgba(20,18,12,.18);
          }
          .welcome-auth-media {
            background-image: linear-gradient(to top, rgba(250,249,246,.84), rgba(250,249,246,.2)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuDnT0tV9Fe6bH-VywONGR08nUjMNWDUoxZhHI3B6CeJRXPS2uxlKuQ560IzVfcbO7s5eUpOX9msH72XJXKRrtHfdmI7MiroC0h-67ya4UyqsYiiKOsFFawAra6W-lgsN0pN_vNgc8xDKq1uXJujhtN0L2re700rN27pO1EMIG0qi3cArdjq2gyGgHKCkAaDdt6Q1uSwlokgufna7MbKiQ31-hTMwBnOhaNQBL6RJbKbtrJ6yj_8RFyX3TP_-7qV_Wqonz1sWnOjIgI");
            filter: grayscale(.02) contrast(1.01);
          }
          .welcome-auth-media-copy h2 {
            color: var(--yellow-700);
          }
          .welcome-auth-media-copy p {
            color: var(--text-body);
          }
          .welcome-auth-panel::-webkit-scrollbar-thumb {
            background: rgba(20,18,12,.18);
          }
          .welcome-banner {
            border-color: rgba(20,164,87,.26);
            background: rgba(20,164,87,.12);
            color: #0a5e30;
          }
          .welcome-banner.warning {
            border-color: rgba(176,140,20,.36);
            background: rgba(238,202,68,.18);
            color: #5b4408;
          }
          .welcome-divider span {
            background: rgba(20,18,12,.1);
          }
          .welcome-terms {
            color: var(--text-body);
          }
          .welcome-terms a {
            color: var(--yellow-700);
          }
        }
        @media (max-height: 850px) {
          .welcome-auth-frame {
            height: clamp(520px, 72vh, 600px);
            max-height: calc(100dvh - 14px);
            min-height: min(500px, calc(100dvh - 14px));
          }
          .welcome-auth-panel {
            padding: 10px 14px;
            gap: 8px;
          }
          .welcome-banner {
            padding: 9px 11px;
            font-size: 10px;
          }
          .welcome-heading h1 {
            font-size: clamp(20px, 2vw, 34px);
          }
          .welcome-auth-media-copy {
            left: 18px;
            right: 18px;
            bottom: 16px;
            gap: 8px;
          }
          .welcome-auth-media-copy p {
            font-size: 13px;
            line-height: 1.45;
          }
        }
        @media (max-height: 720px) {
          .welcome-auth-frame {
            height: auto;
            min-height: 0;
            max-height: none;
          }
          .welcome-auth-panel {
            overflow-y: visible;
          }
        }
        @media (max-width: 980px) {
          .welcome-auth-frame {
            grid-template-columns: 1fr;
            width: min(100%, 760px);
            min-height: unset;
            max-height: none;
            height: auto;
          }
          .welcome-auth-media {
            display: none;
          }
          .welcome-auth-panel {
            overflow-y: visible;
            padding: 18px 16px;
            gap: 12px;
          }
          .welcome-auth-media-policy-shell {
            display: none;
          }
        }
        @media (max-width: 620px) {
          .welcome-auth-provider-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="welcome-auth-frame">
        <section className="welcome-auth-media">
          <div className="welcome-auth-media-copy">
            <div className="welcome-auth-media-policy-shell">
              <div id="welcome-password-policy-host" className="welcome-auth-media-policy-host" />
            </div>
            <h2>Elevate Your Institution</h2>
            <p>
              Access your institution&apos;s central hub. Complete your credentials to enter the next generation of university management.
            </p>
          </div>
        </section>

        <section className="welcome-auth-panel">
          <div className={`welcome-banner ${session ? '' : 'warning'}`}>
            <ShieldCheck size={15} />
            {session
              ? isRecoveryFlow ? 'Recovery Link Verified' : 'Secure Link Verified'
              : isRecoveryFlow ? 'Recovery Link Ready' : 'Invite Link Ready'}
          </div>

          <div className="welcome-heading">
            <h1>{isRecoveryFlow ? 'Reset Password' : 'Finalize Account'}</h1>
            <p>
              {isRecoveryFlow
                ? 'Your secure recovery link is verified. Set a new password or continue with your Google or Microsoft account.'
                : 'Set your password to activate secure access for your invited account.'}
            </p>
          </div>

          <Input
            label={isRecoveryFlow ? 'Account Email Address' : 'Academic Email Address'}
            value={displayEmail}
            readOnly
            disabled
            iconLeft={<Mail size={15} />}
          />

          {visibleNotice && (
            <Alert variant={visibleNotice.variant} title={visibleNotice.title}>
              {visibleNotice.message}
            </Alert>
          )}

          {session && !shouldHidePasswordSetup && !isLinkExpired ? (
            <PasswordSetupCard
              compact
              title={isRecoveryFlow ? 'Set New Password' : 'Create Password'}
              description={
                isRecoveryFlow
                  ? 'Choose a new password for email sign-in, or continue below with Google or Microsoft.'
                  : 'Use an industry-standard password to protect this portal account, or continue below with Google or Microsoft.'
              }
              onPasswordSaved={handlePasswordSaved}
              policyPortalTargetId="welcome-password-policy-host"
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
              size="md"
              disabled={isGoogleLoading || isMicrosoftLoading || isPasswordRedirecting}
              onClick={handleSwitchAccount}
            >
              Switch account
            </Button>
          ) : null}

          {shouldShowStandaloneProviderActions ? (
            <>
              <div className="welcome-divider">
                <span />
                <p>OR SIGN IN WITH</p>
                <span />
              </div>

              <div className="welcome-auth-actions">
                <div className="welcome-auth-provider-grid">
                  <Button
                    variant="subtle"
                    size="md"
                    loading={isGoogleLoading}
                    disabled={isMicrosoftLoading || isPasswordRedirecting || requiresAccountSwitch}
                    iconLeft={<GoogleLogo size={18} />}
                    onClick={() => {
                      void handleGoogleSignIn();
                    }}
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--text-h)',
                      border: '1px solid var(--border-strong)',
                      textTransform: 'none',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Google
                  </Button>
                  <Button
                    variant="subtle"
                    size="md"
                    loading={isMicrosoftLoading}
                    disabled={isGoogleLoading || isPasswordRedirecting || requiresAccountSwitch}
                    iconLeft={<MicrosoftLogo size={18} />}
                    onClick={() => {
                      void handleMicrosoftSignIn();
                    }}
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--text-h)',
                      border: '1px solid var(--border-strong)',
                      textTransform: 'none',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Microsoft
                  </Button>
                </div>

                <p className="welcome-terms">
                  By continuing, you agree to our <a href="#">Institutional Security Terms</a> and{' '}
                  <a href="#">Data Governance Policy</a>.
                </p>
              </div>
            </>
          ) : null}
        </section>
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
