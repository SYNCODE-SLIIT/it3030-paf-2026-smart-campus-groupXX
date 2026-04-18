'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Circle, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, Input } from '@/components/ui';
import { getErrorMessage } from '@/lib/api-client';

type NoticeState =
  | {
      variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
      title: string;
      message: string;
    }
  | null;

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

export function PasswordSetupCard({
  title = 'Password',
  description = 'Set a password for future email sign-in. Google sign-in still works.',
  compact = false,
  onPasswordSaved,
  policyPortalTargetId,
  policyVisualStyle = 'default',
}: {
  title?: string;
  description?: string;
  compact?: boolean;
  onPasswordSaved?: () => void | Promise<void>;
  policyPortalTargetId?: string;
  policyVisualStyle?: 'default' | 'overlay';
}) {
  const { updatePassword } = useAuth();
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [notice, setNotice] = React.useState<NoticeState>(null);
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

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: compact ? 18 : 22,
            fontWeight: 700,
            color: 'var(--text-h)',
          }}
        >
          {title}
        </p>
        <p style={{ marginTop: 4, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body)' }}>{description}</p>
      </div>

      {notice && (
        <Alert variant={notice.variant} title={notice.title}>
          {notice.message}
        </Alert>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : '1fr 1fr',
          gap: 14,
        }}
      >
        <Input
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (notice?.variant === 'error') {
              setNotice(null);
            }
          }}
          iconLeft={<LockKeyhole size={16} />}
          iconRight={
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((prev) => !prev)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                padding: 0,
                margin: 0,
                display: 'flex',
                cursor: 'pointer',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />
        <Input
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            if (notice?.variant === 'error') {
              setNotice(null);
            }
          }}
          iconLeft={<LockKeyhole size={16} />}
          iconRight={
            <button
              type="button"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                padding: 0,
                margin: 0,
                display: 'flex',
                cursor: 'pointer',
              }}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />
      </div>

      {shouldUsePolicyPortal && policyPortalElement
        ? createPortal(policyBlock, policyPortalElement)
        : policyBlock}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="glass"
          size="sm"
          loading={isSaving}
          iconLeft={<ShieldCheck size={14} />}
          onClick={() => {
            const policyMessage = policyErrorMessage(password);
            if (policyMessage) {
              setNotice({
                variant: 'error',
                title: 'Password policy not met',
                message: policyMessage,
              });
              return;
            }

            if (password !== confirmPassword) {
              setNotice({
                variant: 'error',
                title: 'Passwords do not match',
                message: 'Enter the same password twice.',
              });
              return;
            }

            startSaving(async () => {
              try {
                await updatePassword(password);
                if (onPasswordSaved) {
                  await onPasswordSaved();
                }
                setPassword('');
                setConfirmPassword('');
                setShowPassword(false);
                setShowConfirmPassword(false);
                setNotice({
                  variant: 'success',
                  title: 'Password updated',
                  message: 'Email and password sign-in is ready for this account.',
                });
              } catch (error) {
                setNotice({
                  variant: 'error',
                  title: 'Password update failed',
                  message: getErrorMessage(error, 'We could not update your password.'),
                });
              }
            });
          }}
        >
          Activate Account
        </Button>
      </div>
    </div>
  );

  if (compact) {
    return <div>{content}</div>;
  }

  return <Card>{content}</Card>;
}
