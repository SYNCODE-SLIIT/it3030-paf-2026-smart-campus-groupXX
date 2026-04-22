'use client';

import React from 'react';

import { Alert, Button, Card, Divider, GlassPill, Input } from '@/components/ui';

type AlertState = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

interface LoginFormCardProps {
  alert: AlertState;
  isPasswordLoading: boolean;
  isPasswordResetLoading: boolean;
  isGoogleLoading: boolean;
  isMicrosoftLoading: boolean;
  authConfigured: boolean;
  onPasswordSubmit: (email: string, password: string) => void;
  onPasswordReset: (email: string) => void;
  onModeChange?: () => void;
  onGoogleSignIn: () => void;
  onMicrosoftSignIn: () => void;
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94
           M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19
           m-6.72-1.07a3 3 0 1 1-4.24-4.24
           M1 1l22 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
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

function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" fill="#f25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7fba00" />
      <rect x="2" y="13" width="9" height="9" fill="#00a4ef" />
      <rect x="13" y="13" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function LoginFormCard({
  alert,
  isPasswordLoading,
  isPasswordResetLoading,
  isGoogleLoading,
  isMicrosoftLoading,
  authConfigured,
  onPasswordSubmit,
  onPasswordReset,
  onModeChange,
  onGoogleSignIn,
  onMicrosoftSignIn,
}: LoginFormCardProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isResetMode, setIsResetMode] = React.useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isResetMode) {
      onPasswordReset(email);
      return;
    }
    onPasswordSubmit(email, password);
  }

  return (
    <Card hoverable>
      <div style={{ marginBottom: 40 }}>
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
          {isResetMode ? 'Reset Password' : 'Welcome Back'}
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
          {isResetMode
            ? 'Enter your account email and we will send a secure reset link'
            : 'Sign in to your Smart Campus dashboard'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {alert && (
          <Alert variant={alert.variant} title={alert.title}>
            {alert.message}
          </Alert>
        )}

        <Input
          id="login-email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@university.edu"
          autoComplete="email"
          required
          disabled={!authConfigured}
        />

        {!isResetMode && (
          <div style={{ position: 'relative' }}>
            <Input
              id="login-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={!authConfigured}
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 13,
                bottom: 0,
                height: 46,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 0,
              }}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={!authConfigured}
            loading={isResetMode ? isPasswordResetLoading : isPasswordLoading}
          >
            {isResetMode ? 'Send Reset Link' : 'Sign In'}
          </Button>
          <button
            type="button"
            onClick={() => {
              setIsResetMode((current) => !current);
              onModeChange?.();
            }}
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              transition: 'color .15s',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isResetMode ? 'Back to Sign In' : 'Forgot Password?'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Divider label="OR SIGN IN WITH" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <Button
            variant="subtle"
            size="lg"
            fullWidth
            disabled={!authConfigured || isMicrosoftLoading}
            loading={isGoogleLoading}
            iconLeft={<GoogleLogo />}
            onClick={onGoogleSignIn}
            style={{
              background: 'var(--neutral-900)',
              color: '#f8f8f8',
              border: '1px solid var(--neutral-700)',
              textTransform: 'none',
              letterSpacing: '0.01em',
            }}
          >
            Google
          </Button>
          <Button
            variant="subtle"
            size="lg"
            fullWidth
            disabled={!authConfigured || isGoogleLoading}
            loading={isMicrosoftLoading}
            iconLeft={<MicrosoftLogo />}
            onClick={onMicrosoftSignIn}
            style={{
              background: 'var(--neutral-900)',
              color: '#f8f8f8',
              border: '1px solid var(--neutral-700)',
              textTransform: 'none',
              letterSpacing: '0.01em',
            }}
          >
            Microsoft
          </Button>
        </div>
      </div>

      {!authConfigured && (
        <GlassPill style={{ padding: '10px 12px', marginTop: 16 }}>
          <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-body)', margin: 0 }}>
            Auth is unavailable until the Supabase public keys are configured.
          </p>
        </GlassPill>
      )}
    </Card>
  );
}
