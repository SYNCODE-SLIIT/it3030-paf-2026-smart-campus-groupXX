'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Circle, Eye, EyeOff, LockKeyhole } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Divider, Input } from '@/components/ui';
import { getErrorMessage } from '@/lib/api-client';

type AlertState = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

interface PasswordPolicyRule {
  id: 'length' | 'uppercase' | 'lowercase' | 'number' | 'special';
  label: string;
  test: (value: string) => boolean;
}

const PASSWORD_POLICY_RULES: PasswordPolicyRule[] = [
  {
    id: 'length',
    label: 'At least 8 characters',
    test: (value) => value.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    test: (value) => /[a-z]/.test(value),
  },
  {
    id: 'number',
    label: 'One number',
    test: (value) => /[0-9]/.test(value),
  },
  {
    id: 'special',
    label: 'One special character',
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

function evaluatePasswordPolicy(password: string) {
  return PASSWORD_POLICY_RULES.map((rule) => ({
    ...rule,
    isValid: rule.test(password),
  }));
}

function policyErrorMessage(password: string) {
  const evaluations = evaluatePasswordPolicy(password);
  const unmet = evaluations.filter((rule) => !rule.isValid);

  if (!unmet.length) {
    return null;
  }

  return `Password must include: ${unmet.map((rule) => rule.label.toLowerCase()).join(', ')}.`;
}

function GoogleLogo({ size = 18 }: { size?: number }) {
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

export function PasswordSetupCard({
  title = 'Password',
  description = 'Set a password for future email sign-in. Google and Microsoft sign-in still work.',
  compact = false,
  onPasswordSaved,
  policyPortalTargetId,
  policyVisualStyle = 'default',
  submitLabel = 'Activate Account',
  showProviderActions = false,
  providerActionsDisabled = false,
  isGoogleLoading = false,
  isMicrosoftLoading = false,
  onGoogleSignIn,
  onMicrosoftSignIn,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
  onPasswordSaved?: () => void | Promise<void>;
  policyPortalTargetId?: string;
  policyVisualStyle?: 'default' | 'overlay';
  submitLabel?: string;
  showProviderActions?: boolean;
  providerActionsDisabled?: boolean;
  isGoogleLoading?: boolean;
  isMicrosoftLoading?: boolean;
  onGoogleSignIn?: () => void;
  onMicrosoftSignIn?: () => void;
}) {
  const { updatePassword } = useAuth();
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [alert, setAlert] = React.useState<AlertState>(null);
  const [isSaving, startSaving] = React.useTransition();
  const policyState = React.useMemo(() => evaluatePasswordPolicy(password), [password]);
  const [policyPortalElement, setPolicyPortalElement] = React.useState<HTMLElement | null>(null);
  const [shouldUsePolicyPortal, setShouldUsePolicyPortal] = React.useState(false);

  React.useEffect(() => {
    if (!policyPortalTargetId || typeof window === 'undefined') {
      setPolicyPortalElement(null);
      setShouldUsePolicyPortal(false);
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 981px)');
    const updatePortalState = () => {
      setPolicyPortalElement(document.getElementById(policyPortalTargetId));
      setShouldUsePolicyPortal(mediaQuery.matches);
    };

    updatePortalState();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePortalState);
      return () => {
        mediaQuery.removeEventListener('change', updatePortalState);
      };
    }

    mediaQuery.addListener(updatePortalState);
    return () => {
      mediaQuery.removeListener(updatePortalState);
    };
  }, [policyPortalTargetId]);

  const isOverlayPolicy = policyVisualStyle === 'overlay';
  const policyMutedColor = isOverlayPolicy ? 'rgba(255,255,255,.72)' : 'var(--text-muted)';

  const policyBlock = (
    <div
      className="password-policy-block"
      style={{
        display: 'grid',
        gap: 8,
        padding: compact ? '12px 14px' : '14px 16px',
        borderRadius: 'var(--radius-md)',
        border: isOverlayPolicy ? '1px solid rgba(255,255,255,.2)' : '1px solid var(--border)',
        background: isOverlayPolicy ? 'rgba(12,12,12,.58)' : 'var(--surface-2)',
        backdropFilter: isOverlayPolicy ? 'blur(8px)' : undefined,
        WebkitBackdropFilter: isOverlayPolicy ? 'blur(8px)' : undefined,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: policyMutedColor,
        }}
      >
        Password policy
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 8,
        }}
      >
        {policyState.map((rule) => (
          <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span
              style={{
                color: rule.isValid ? 'var(--green-500)' : policyMutedColor,
                display: 'inline-flex',
              }}
            >
              {rule.isValid ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: rule.isValid ? 'var(--green-500)' : policyMutedColor,
              }}
            >
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const policyMessage = policyErrorMessage(password);
    if (policyMessage) {
      setAlert({
        variant: 'error',
        title: 'Password policy not met',
        message: policyMessage,
      });
      return;
    }

    if (password !== confirmPassword) {
      setAlert({
        variant: 'error',
        title: 'Passwords do not match',
        message: 'Enter the same password twice.',
      });
      return;
    }

    setAlert(null);

    startSaving(async () => {
      try {
        await updatePassword(password);
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setAlert({
          variant: 'success',
          title: 'Password updated',
          message: 'Email and password sign-in is ready for this account.',
        });
        if (onPasswordSaved) {
          await onPasswordSaved();
        }
      } catch (error) {
        const message = getErrorMessage(error, 'We could not update your password.');
        const isSessionExpired = message.toLowerCase().includes('secure session expired');
        setAlert({
          variant: 'error',
          title: isSessionExpired ? 'Session expired' : 'Password update failed',
          message,
        });
      }
    });
  }

  const passwordInput = (
    <div style={{ position: 'relative' }}>
      <Input
        id="setup-password"
        label="New Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter a new password"
        autoComplete="new-password"
        iconLeft={<LockKeyhole size={16} />}
        required
        style={{ paddingRight: 44 }}
      />
      <button
        type="button"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        onClick={() => setShowPassword((prev) => !prev)}
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
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  const confirmInput = (
    <div style={{ position: 'relative' }}>
      <Input
        id="setup-confirm-password"
        label="Confirm Password"
        type={showConfirmPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        placeholder="Confirm your new password"
        autoComplete="new-password"
        iconLeft={<LockKeyhole size={16} />}
        required
        style={{ paddingRight: 44 }}
      />
      <button
        type="button"
        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
        onClick={() => setShowConfirmPassword((prev) => !prev)}
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
        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 12 : 20 }}>
      <div style={{ marginBottom: compact ? 0 : 20 }}>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: compact ? 24 : 32,
            fontWeight: 800,
            letterSpacing: 0,
            color: 'var(--text-h)',
            margin: '0 0 8px',
            lineHeight: 1.15,
          }}
        >
          {title}
        </p>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, lineHeight: 1.55 }}>
          {description}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {alert && (
          <Alert variant={alert.variant} title={alert.title}>
            {alert.message}
          </Alert>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: compact ? '1fr' : '1fr 1fr',
            gap: 14,
          }}
        >
          {passwordInput}
          {confirmInput}
        </div>

        {shouldUsePolicyPortal && policyPortalElement
          ? createPortal(policyBlock, policyPortalElement)
          : policyBlock}

        <Button type="submit" variant="primary" size="lg" fullWidth loading={isSaving}>
          {submitLabel}
        </Button>
      </form>

      {showProviderActions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Divider label="OR SIGN IN WITH" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <Button
              variant="subtle"
              size="lg"
              fullWidth
              disabled={providerActionsDisabled || isMicrosoftLoading}
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
              disabled={providerActionsDisabled || isGoogleLoading}
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
      )}
    </div>
  );

  if (compact) {
    return <div>{content}</div>;
  }

  return <Card hoverable>{content}</Card>;
}
