'use client';

import React from 'react';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Divider, GlassPill, Input } from '@/components/ui';
import { getErrorMessage } from '@/lib/api-client';
import { getLoginReasonAlert, getUserHomePath, needsStudentOnboarding } from '@/lib/auth-routing';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AlertState =
  | {
      variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
      title: string;
      message: string;
    }
  | null;

export function LoginScreen({ reason }: { reason: string | null }) {
  const router = useRouter();
  const { authConfigured, appUser, refreshMe, signInWithGoogle, signInWithPassword } = useAuth();
  const initialAlert = React.useMemo(() => getLoginReasonAlert(reason), [reason]);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [alert, setAlert] = React.useState<AlertState>(initialAlert);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = React.useState(false);

  React.useEffect(() => {
    if (!appUser) {
      return;
    }

    if (needsStudentOnboarding(appUser)) {
      router.replace('/student/onboarding');
      return;
    }

    router.replace(getUserHomePath(appUser));
  }, [appUser, router]);

  async function handleGoogleSignIn() {
    setAlert(null);
    setIsGoogleLoading(true);

    try {
      await signInWithGoogle();
    } catch (error) {
      setAlert({
        variant: 'error',
        title: 'Google sign-in failed',
        message: getErrorMessage(error, 'We could not start Google authentication.'),
      });
      setIsGoogleLoading(false);
    }
  }

  async function handlePasswordLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authConfigured) {
      setAlert({
        variant: 'warning',
        title: 'Authentication is not configured',
        message: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before signing in.',
      });
      return;
    }

    if (!emailPattern.test(email)) {
      setAlert({
        variant: 'error',
        title: 'Enter a valid email',
        message: 'Use the invited email address for your Smart Campus account.',
      });
      return;
    }

    if (!password.trim()) {
      setAlert({
        variant: 'error',
        title: 'Enter your password',
        message: 'Email and password sign-in requires the password configured in Supabase Auth.',
      });
      return;
    }

    setAlert(null);
    setIsPasswordLoading(true);

    try {
      await signInWithPassword(email.trim(), password);
      const currentUser = await refreshMe();

      if (currentUser) {
        if (needsStudentOnboarding(currentUser)) {
          router.replace('/student/onboarding');
        } else {
          router.replace(getUserHomePath(currentUser));
        }
        return;
      }

      setAlert({
        variant: 'error',
        title: 'Sign-in incomplete',
        message: 'Your session was created, but account data could not be loaded. Please try again.',
      });
    } catch (error) {
      setAlert({
        variant: 'error',
        title: 'Password sign-in failed',
        message: getErrorMessage(error, 'We could not sign you in with email and password.'),
      });
    } finally {
      setIsPasswordLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background:
          'radial-gradient(circle at top left, rgba(238,202,68,.18), transparent 28%), linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg) 100%)',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--text-h)',
              }}
            >
              Sign in
            </h1>
            <p
              style={{
                marginTop: 8,
                fontSize: 13.5,
                lineHeight: 1.55,
                color: 'var(--text-body)',
              }}
            >
              Use your invited email. Password and Google sign-in are supported.
            </p>
          </div>

          {alert && (
            <Alert variant={alert.variant} title={alert.title}>
              {alert.message}
            </Alert>
          )}

          <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              id="login-email"
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              iconLeft={<Mail size={16} />}
            />
            <Input
              id="login-password"
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              iconLeft={<LockKeyhole size={16} />}
            />
            <Button
              type="submit"
              variant="glass"
              size="lg"
              fullWidth
              disabled={!authConfigured}
              loading={isPasswordLoading}
              iconLeft={<LockKeyhole size={16} />}
            >
              Sign in
            </Button>
          </form>

          <Divider label="or" />

          <Button
            variant="subtle"
            size="lg"
            fullWidth
            disabled={!authConfigured}
            onClick={() => {
              void handleGoogleSignIn();
            }}
            loading={isGoogleLoading}
            iconLeft={<ShieldCheck size={16} />}
          >
            Sign in with Google
          </Button>

          {!authConfigured && (
            <GlassPill style={{ padding: '10px 12px' }}>
              <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-body)' }}>
                Auth is unavailable until the Supabase public keys are configured.
              </p>
            </GlassPill>
          )}
        </div>
      </Card>
    </div>
  );
}
