'use client';

import React from 'react';
import { LockKeyhole } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, Button, Card, GlassPill, Input } from '@/components/ui';
import { getErrorMessage } from '@/lib/api-client';

type NoticeState =
  | {
      variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
      title: string;
      message: string;
    }
  | null;

export function PasswordSetupCard({
  title = 'Password',
  description = 'Set a password for future email sign-in. Google sign-in still works.',
  compact = false,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  const { updatePassword } = useAuth();
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [notice, setNotice] = React.useState<NoticeState>(null);
  const [isSaving, startSaving] = React.useTransition();

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
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          iconLeft={<LockKeyhole size={16} />}
        />
        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          iconLeft={<LockKeyhole size={16} />}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="glass"
          size="sm"
          loading={isSaving}
          iconLeft={<LockKeyhole size={14} />}
          onClick={() => {
            if (password.length < 8) {
              setNotice({
                variant: 'error',
                title: 'Password too short',
                message: 'Use at least 8 characters.',
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
                setPassword('');
                setConfirmPassword('');
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
          Save Password
        </Button>
      </div>
    </div>
  );

  if (compact) {
    return <GlassPill style={{ padding: '16px 18px' }}>{content}</GlassPill>;
  }

  return <Card>{content}</Card>;
}
