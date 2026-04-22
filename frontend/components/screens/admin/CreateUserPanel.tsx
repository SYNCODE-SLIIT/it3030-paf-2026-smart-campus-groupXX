'use client';

import React from 'react';
import { UserPlus } from 'lucide-react';

import { AdminConfirmDialog } from '@/components/screens/admin/AdminConfirmDialog';
import { ProfileFields } from '@/components/screens/admin/ProfileFields';
import { RoleRadioGroup } from '@/components/screens/admin/RoleRadioGroup';
import { Alert, Button, Card, Input, Select } from '@/components/ui';
import { createUser, getErrorMessage } from '@/lib/api-client';
import type { CreateUserRequest, ManagerRole, UserResponse, UserType } from '@/lib/api-types';
import {
  createEmptyAdminForm,
  createEmptyFacultyForm,
  createEmptyManagerForm,
  toAdminProfileInput,
  toFacultyProfileInput,
  toManagerProfileInput,
} from '@/components/screens/admin/adminUserFormUtils';

const userTypeOptions: Array<{ value: UserType; label: string }> = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
];

export function CreateUserPanel({
  accessToken,
  onCreated,
  embedded = false,
  onCancel,
  defaultUserType = 'STUDENT',
  fixedUserType,
}: {
  accessToken: string | null;
  onCreated: (user: UserResponse) => Promise<void>;
  embedded?: boolean;
  onCancel?: () => void;
  defaultUserType?: UserType;
  fixedUserType?: UserType;
}) {
  const [email, setEmail] = React.useState('');
  const [userType, setUserType] = React.useState<UserType>(fixedUserType ?? defaultUserType);
  const [managerRole, setManagerRole] = React.useState<ManagerRole | ''>('');
  const [facultyForm, setFacultyForm] = React.useState(createEmptyFacultyForm);
  const [adminForm, setAdminForm] = React.useState(createEmptyAdminForm);
  const [managerForm, setManagerForm] = React.useState(createEmptyManagerForm);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [formSuccess, setFormSuccess] = React.useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = React.useState<CreateUserRequest | null>(null);
  const [isCreating, startCreateTransition] = React.useTransition();

  React.useEffect(() => {
    if (fixedUserType) {
      setUserType(fixedUserType);
    }
  }, [fixedUserType]);

  function buildCreatePayload() {
    if (!accessToken) {
      setFormError('The admin session is unavailable. Please sign in again.');
      return null;
    }

    if (!email.trim()) {
      setFormError('Email is required.');
      return null;
    }

    const selectedManagerRole = userType === 'MANAGER' ? managerRole : '';

    if (userType === 'MANAGER' && !selectedManagerRole) {
      setFormError('Select one manager role.');
      return null;
    }

    setFormError(null);
    setFormSuccess(null);

    return {
      email: email.trim(),
      userType,
      sendInvite: true,
      ...(userType === 'FACULTY' ? { facultyProfile: toFacultyProfileInput(facultyForm) } : {}),
      ...(userType === 'ADMIN' ? { adminProfile: toAdminProfileInput(adminForm) } : {}),
      ...(userType === 'MANAGER' ? { managerProfile: toManagerProfileInput(managerForm) } : {}),
      ...(selectedManagerRole ? { managerRole: selectedManagerRole } : {}),
    } satisfies CreateUserRequest;
  }

  function handleCreateRequest() {
    const payload = buildCreatePayload();
    if (!payload) return;
    setPendingPayload(payload);
  }

  async function handleCreate() {
    if (!accessToken || !pendingPayload) {
      setFormError('The admin session is unavailable. Please sign in again.');
      setPendingPayload(null);
      return;
    }

    startCreateTransition(async () => {
      try {
        const createdUser = await createUser(accessToken, pendingPayload);

        setFormSuccess(createdUser.lastInviteReference
          ? 'User added, sign-in email sent, and a test link was returned.'
          : 'User added and sign-in email sent.');

        setEmail('');
        setUserType(fixedUserType ?? defaultUserType);
        setManagerRole('');
        setFacultyForm(createEmptyFacultyForm());
        setAdminForm(createEmptyAdminForm());
        setManagerForm(createEmptyManagerForm());
        setPendingPayload(null);

        await onCreated(createdUser);
      } catch (error) {
        const message = getErrorMessage(error, 'We could not create the user.');
        setFormError(message);
        setFormSuccess(null);
        setPendingPayload(null);
      }
    });
  }

  const content = (
    <>
      <style>{`
        .admin-editor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }
      `}</style>
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

      {formSuccess && (
        <Alert variant="success" title="User created" style={{ marginBottom: 16 }}>
          {formSuccess}
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

        {fixedUserType ? (
          <Input label="Role" value={userTypeOptions.find((option) => option.value === fixedUserType)?.label ?? fixedUserType} disabled />
        ) : (
          <Select
            label="Role"
            value={userType}
            onChange={(event) => setUserType(event.target.value as UserType)}
            options={userTypeOptions}
          />
        )}

        <ProfileFields
          userType={userType}
          facultyForm={facultyForm}
          setFacultyForm={setFacultyForm}
          adminForm={adminForm}
          setAdminForm={setAdminForm}
          managerForm={managerForm}
          setManagerForm={setManagerForm}
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
              handleCreateRequest();
            }}
          >
            Create User
          </Button>
        </div>
      </div>

      <AdminConfirmDialog
        open={!!pendingPayload}
        title="Create user?"
        description="This will create the account and send the first sign-in email immediately."
        confirmLabel="Create and Send"
        confirmVariant="primary"
        confirmIcon={<UserPlus size={14} />}
        loading={isCreating}
        disabled={!accessToken}
        onClose={() => setPendingPayload(null)}
        onConfirm={() => {
          void handleCreate();
        }}
      >
        <div style={{ display: 'grid', gap: 8, color: 'var(--text-body)', fontSize: 13 }}>
          <span>
            <strong style={{ color: 'var(--text-h)' }}>Email:</strong> {pendingPayload?.email}
          </span>
          <span>
            <strong style={{ color: 'var(--text-h)' }}>Role:</strong>{' '}
            {userTypeOptions.find((option) => option.value === pendingPayload?.userType)?.label ?? pendingPayload?.userType}
          </span>
        </div>
      </AdminConfirmDialog>
    </>
  );

  if (embedded) {
    return content;
  }

  return <Card>{content}</Card>;
}
