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
  isInviteFlowEmailMatch,
  primeInviteFlowState,
  readInviteFlowState,
} from '@/lib/invite-flow';

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
  const router = useRouter();
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
  const [notice, setNotice] = React.useState<NoticeState>(initialReasonNotice);
  const [isHydratingUser, setIsHydratingUser] = React.useState(false);
  const [isPasswordRedirecting, setIsPasswordRedirecting] = React.useState(false);
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
          message: 'Password was saved, but we could not load your profile yet. Please continue with Google sign-in.',
        });
        return;
      }

      const nextStep = needsStudentOnboarding(resolvedUser) ? 'ONBOARDING' : 'DASHBOARD';
      const nextPath = getPostAuthRedirect(resolvedUser, nextStep);
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
    <div
      style={{
        minHeight: '100dvh',
        position: 'relative',
        padding: 'clamp(6px, 1.1vw, 14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowX: 'hidden',
        overflowY: 'auto',
        background:
          'radial-gradient(circle at 8% 10%, rgba(238,202,68,.14), transparent 30%), radial-gradient(circle at 92% 92%, rgba(70,66,55,.32), transparent 28%), linear-gradient(180deg, #121212 0%, #161514 100%)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '10% auto auto 6%',
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: 'rgba(238,202,68,.11)',
          filter: 'blur(92px)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 'auto 3% 8% auto',
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: 'rgba(72,68,60,.35)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }}
      />
      <style>{`
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
      `}</style>

      <div className="welcome-auth-frame">
        <section className="welcome-auth-media">
          <div className="welcome-auth-media-copy">
            <div className="welcome-auth-media-policy-shell">
              <div id="welcome-password-policy-host" className="welcome-auth-media-policy-host" />
            </div>
            <h2>Elevate Your Institution</h2>
            <p>
              Access your institution's central hub. Complete your credentials to enter the next generation of university management.
            </p>
          </div>
        </section>

        <section className="welcome-auth-panel">
          <div className={`welcome-banner ${session ? '' : 'warning'}`}>
            <ShieldCheck size={15} />
            {session ? 'Secure Link Verified' : 'Invite Link Ready'}
          </div>

          <div className="welcome-heading">
            <h1>Finalize Account</h1>
            <p>Set your master password to activate secure access for your invited account.</p>
          </div>

          <Input
            label="Academic Email Address"
            value={displayEmail}
            readOnly
            disabled
            iconLeft={<Mail size={15} />}
          />

          {session && !shouldHidePasswordSetup ? (
            <PasswordSetupCard
              compact
              title="Create Master Password"
              description="Use an industry-standard password to protect this portal account."
              onPasswordSaved={handlePasswordSaved}
              policyPortalTargetId="welcome-password-policy-host"
              policyVisualStyle="overlay"
            />
          ) : null}

          {notice && (
            <Alert variant={notice.variant} title={notice.title}>
              {notice.message}
            </Alert>
          )}

          {!session ? (
            <Alert variant="info" title="Authentication required">
              Continue with Google sign-in below. Password setup will appear after invite authentication is complete.
            </Alert>
          ) : null}

          {!appUser && session && !shouldHidePasswordSetup ? (
            <Alert variant="warning" title="Profile still loading">
              Your invite session is active, but profile sync is still running. Wait a moment, or continue with Google sign-in.
            </Alert>
          ) : null}

          <div className="welcome-divider">
            <span />
            <p>Or Authenticate With</p>
            <span />
          </div>

          <div className="welcome-auth-actions">
            <Button
              variant="subtle"
              size="md"
              loading={isGoogleLoading || isPasswordRedirecting}
              iconLeft={<GoogleLogo size={18} />}
              onClick={() => {
                void handleGoogleSignIn();
              }}
            >
              Sign In With SSO / Google
            </Button>

            <p className="welcome-terms">
              By continuing, you agree to our <a href="#">Institutional Security Terms</a> and{' '}
              <a href="#">Data Governance Policy</a>.
            </p>
          </div>
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
