'use client';

import React from 'react';
import { UserPlus } from 'lucide-react';

import { RoleRadioGroup } from '@/components/screens/admin/RoleRadioGroup';
import { Alert, Button, Card, Input, Select } from '@/components/ui';
import { createUser, getErrorMessage } from '@/lib/api-client';
import type { CreateUserRequest, ManagerRole, UserResponse, UserType } from '@/lib/api-types';

const userTypeOptions: Array<{ value: UserType; label: string }> = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
];

type NoticeState =
  | {
      variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
      title: string;
      message: string;
    }
  | null;

export function CreateUserPanel({
  accessToken,
  onCreated,
  onNotice,
  embedded = false,
  onCancel,
}: {
  accessToken: string | null;
  onCreated: (user: UserResponse) => Promise<void>;
  onNotice: (notice: NoticeState) => void;
  embedded?: boolean;
  onCancel?: () => void;
}) {
  const [email, setEmail] = React.useState('');
  const [userType, setUserType] = React.useState<UserType>('STUDENT');
  const [managerRole, setManagerRole] = React.useState<ManagerRole | ''>('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isCreating, startCreateTransition] = React.useTransition();

  async function handleCreate() {
    if (!accessToken) {
      setFormError('The admin session is unavailable. Please sign in again.');
      return;
    }

    if (!email.trim()) {
      setFormError('Email is required.');
      return;
    }

    const selectedManagerRole = userType === 'MANAGER' ? managerRole : '';

    if (userType === 'MANAGER' && !selectedManagerRole) {
      setFormError('Select one manager role.');
      return;
    }

    setFormError(null);

    startCreateTransition(async () => {
      try {
        const payload: CreateUserRequest = {
          email: email.trim(),
          userType,
          sendInvite: true,
          ...(selectedManagerRole ? { managerRole: selectedManagerRole } : {}),
        };

        const createdUser = await createUser(accessToken, payload);

        onNotice({
          variant: 'success',
          title: 'User created',
          message: createdUser.lastInviteReference
            ? 'User added and access link generated.'
            : 'User added successfully.',
        });

        setEmail('');
        setUserType('STUDENT');
        setManagerRole('');

        await onCreated(createdUser);
      } catch (error) {
        const message = getErrorMessage(error, 'We could not create the user.');
        setFormError(message);
        onNotice({
          variant: 'error',
          title: 'User creation failed',
          message,
        });
      }
    });
  }

  const content = (
    <>
      {!embedded && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ display: 'flex', color: 'var(--yellow-500)' }}>
            <UserPlus size={18} />
          </span>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-h)',
            }}
          >
            Add User
          </p>
        </div>
      )}

      {formError && (
        <Alert variant="error" title="Unable to create user" style={{ marginBottom: 16 }}>
          {formError}
        </Alert>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        <Input
          id="admin-create-user-email"
          name="admin-create-user-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="user@example.com"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={embedded}
          required
        />

        <Select
          label="Role"
          value={userType}
          onChange={(event) => setUserType(event.target.value as UserType)}
          options={userTypeOptions}
        />

        {userType === 'MANAGER' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              Manager Roles
            </p>
            <RoleRadioGroup value={managerRole} onChange={setManagerRole} />
          </div>
        )}

        <Alert variant="info" title="Access link">
          A login link will be generated for this user immediately after creation so you can copy it and test sign-in.
        </Alert>

        <div style={{ display: 'flex', justifyContent: onCancel ? 'space-between' : 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          {onCancel && (
            <Button type="button" variant="subtle" size="sm" disabled={isCreating} onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="glass"
            size="sm"
            loading={isCreating}
            iconLeft={<UserPlus size={14} />}
            onClick={() => {
              void handleCreate();
            }}
          >
            Create User
          </Button>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return <Card>{content}</Card>;
}
