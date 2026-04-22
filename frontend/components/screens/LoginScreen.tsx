'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { LoginFormCard } from '@/components/screens/login/LoginFormCard';
import { LoginSideCards } from '@/components/screens/login/LoginSideCards';
import { getErrorMessage, requestPasswordReset } from '@/lib/api-client';
import {
  getLoginReasonAlert,
  getUserHomePath,
  needsStudentOnboarding,
  STUDENT_ONBOARDING_PATH,
} from '@/lib/auth-routing';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AlertState = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

export function LoginScreen({ reason }: { reason: string | null }) {
  const router = useRouter();
  const { authConfigured, appUser, refreshMe, signInWithGoogle, signInWithMicrosoft, signInWithPassword } = useAuth();
  const initialAlert = React.useMemo(() => getLoginReasonAlert(reason), [reason]);
  const [alert, setAlert] = React.useState<AlertState>(initialAlert);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = React.useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = React.useState(false);
  const [isPasswordResetLoading, setIsPasswordResetLoading] = React.useState(false);

  React.useEffect(() => {
    if (!appUser) return;
    if (needsStudentOnboarding(appUser)) {
      router.replace(STUDENT_ONBOARDING_PATH);
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

  async function handleMicrosoftSignIn() {
    setAlert(null);
    setIsMicrosoftLoading(true);
    try {
      await signInWithMicrosoft();
    } catch (error) {
      setAlert({
        variant: 'error',
        title: 'Microsoft sign-in failed',
        message: getErrorMessage(error, 'We could not start Microsoft authentication.'),
      });
      setIsMicrosoftLoading(false);
    }
  }

  async function handlePasswordSubmit(email: string, password: string) {
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
          router.replace(STUDENT_ONBOARDING_PATH);
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
        title: 'Unable to sign in',
        message: getErrorMessage(error, 'We could not sign you in with email and password.'),
      });
    } finally {
      setIsPasswordLoading(false);
    }
  }

  async function handlePasswordReset(email: string) {
    if (!authConfigured) {
      setAlert({
        variant: 'warning',
        title: 'Authentication is not configured',
        message: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before requesting a reset link.',
      });
      return;
    }

    if (!emailPattern.test(email)) {
      setAlert({
        variant: 'error',
        title: 'Enter a valid email',
        message: 'Use the email address for your Smart Campus account.',
      });
      return;
    }

    setAlert(null);
    setIsPasswordResetLoading(true);

    try {
      const response = await requestPasswordReset(email.trim());
      setAlert({
        variant: 'success',
        title: 'Check your email',
        message: response.message,
      });
    } catch (error) {
      setAlert({
        variant: 'error',
        title: 'Reset request failed',
        message: getErrorMessage(error, 'We could not request a password reset email.'),
      });
    } finally {
      setIsPasswordResetLoading(false);
    }
  }

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
          aria-label="Sign in"
          className="grid w-full grid-cols-1 md:grid-cols-12 gap-6 items-stretch"
          style={{ maxWidth: 1100 }}
        >
          <div className="col-span-1 md:col-span-7">
            <LoginFormCard
              alert={alert}
              isPasswordLoading={isPasswordLoading}
              isPasswordResetLoading={isPasswordResetLoading}
              isGoogleLoading={isGoogleLoading}
              isMicrosoftLoading={isMicrosoftLoading}
              authConfigured={authConfigured}
              onPasswordSubmit={(email, password) => {
                void handlePasswordSubmit(email, password);
              }}
              onPasswordReset={(email) => {
                void handlePasswordReset(email);
              }}
              onModeChange={() => setAlert(null)}
              onGoogleSignIn={() => {
                void handleGoogleSignIn();
              }}
              onMicrosoftSignIn={() => {
                void handleMicrosoftSignIn();
              }}
            />
          </div>
          <aside className="col-span-1 md:col-span-5 flex flex-col">
            <LoginSideCards />
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
