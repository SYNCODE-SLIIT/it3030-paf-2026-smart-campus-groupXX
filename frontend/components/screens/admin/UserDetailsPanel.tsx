'use client';

import React from 'react';
import { Copy, Mail, ShieldCheck } from 'lucide-react';

import { RoleCheckboxGroup } from '@/components/screens/admin/RoleCheckboxGroup';
import { Alert, Button, Card, Chip, Input, Select } from '@/components/ui';
import { getErrorMessage, replaceManagerRoles, resendInvite, updateUser } from '@/lib/api-client';
import type { AccountStatus, ManagerRole, UpdateUserRequest, UserResponse } from '@/lib/api-types';
import { getAccountStatusChipColor, getAccountStatusLabel, getManagerRoleLabel, getUserTypeChipColor, getUserTypeLabel } from '@/lib/user-display';

function rolesEqual(a: ManagerRole[], b: ManagerRole[]) {
  if (a.length !== b.length) {
    return false;
  }

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

const accountStatusOptions: Array<{ value: AccountStatus; label: string }> = [
  { value: 'INVITED', label: 'Invited' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

type NoticeState =
  | {
      variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
      title: string;
      message: string;
    }
  | null;

export function UserDetailsPanel({
  user,
  accessToken,
  onReload,
  onNotice,
}: {
  user: UserResponse | null;
  accessToken: string | null;
  onReload: (preferredUserId?: string) => Promise<void>;
  onNotice: (notice: NoticeState) => void;
}) {
  const [accountStatus, setAccountStatus] = React.useState<AccountStatus>('INVITED');
  const [managerRoles, setManagerRoles] = React.useState<ManagerRole[]>([]);
  const [panelError, setPanelError] = React.useState<string | null>(null);
  const [isSaving, startSaveTransition] = React.useTransition();
  const [isResending, startResendTransition] = React.useTransition();
  const [isCopying, startCopyTransition] = React.useTransition();

  React.useEffect(() => {
    if (!user) {
      return;
    }

    setAccountStatus(user.accountStatus);
    setManagerRoles(user.managerRoles);
    setPanelError(null);
  }, [user]);

  if (!user) {
    return (
      <Card>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-h)',
            marginBottom: 6,
          }}
        >
          Select a user
        </p>
      </Card>
    );
  }

  const currentUser = user;
  const adminRecord = currentUser.userType === 'ADMIN';

  async function handleSave() {
    if (!accessToken) {
      setPanelError('The admin session is unavailable. Please sign in again.');
      return;
    }

    if (adminRecord) {
      return;
    }

    setPanelError(null);

    startSaveTransition(async () => {
      try {
        const payload: UpdateUserRequest = {
          accountStatus,
        };

        await updateUser(accessToken, currentUser.id, payload);

        if (currentUser.userType === 'MANAGER' && !rolesEqual(managerRoles, currentUser.managerRoles)) {
          await replaceManagerRoles(accessToken, currentUser.id, {
            managerRoles,
          });
        }

        await onReload(currentUser.id);
        onNotice({
          variant: 'success',
          title: 'Saved',
          message: 'User access updated.',
        });
      } catch (error) {
        const message = getErrorMessage(error, 'We could not update this user.');
        setPanelError(message);
        onNotice({
          variant: 'error',
          title: 'Update failed',
          message,
        });
      }
    });
  }

  async function handleResendInvite() {
    if (!accessToken) {
      setPanelError('The admin session is unavailable. Please sign in again.');
      return;
    }

    setPanelError(null);

    startResendTransition(async () => {
      try {
        const response = await resendInvite(accessToken, currentUser.id);
        await onReload(currentUser.id);
        onNotice({
          variant: 'success',
          title: 'Access link generated',
          message: response.message,
        });
      } catch (error) {
        const message = getErrorMessage(error, 'We could not generate a new access link.');
        setPanelError(message);
        onNotice({
          variant: 'error',
          title: 'Link generation failed',
          message,
        });
      }
    });
  }

  async function handleCopyLink() {
    const latestInviteLink = currentUser.lastInviteReference;

    if (!latestInviteLink) {
      return;
    }

    startCopyTransition(async () => {
      try {
        await navigator.clipboard.writeText(latestInviteLink);
        onNotice({
          variant: 'success',
          title: 'Copied',
          message: 'Access link copied to clipboard.',
        });
      } catch {
        onNotice({
          variant: 'error',
          title: 'Copy failed',
          message: 'Could not copy the access link.',
        });
      }
    });
  }

  return (
    <Card>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-h)',
            }}
          >
            {currentUser.email}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip color={getUserTypeChipColor(currentUser.userType)} dot>
            {getUserTypeLabel(currentUser.userType)}
          </Chip>
          <Chip color={getAccountStatusChipColor(currentUser.accountStatus)} dot>
            {getAccountStatusLabel(currentUser.accountStatus)}
          </Chip>
          {currentUser.managerRoles.map((role) => (
            <Chip key={role} color="blue">
              {getManagerRoleLabel(role)}
            </Chip>
          ))}
        </div>

        {panelError && (
          <Alert variant="error" title="Unable to save">
            {panelError}
          </Alert>
        )}

        {!adminRecord && (
          <Select
            label="Account Status"
            value={accountStatus}
            onChange={(event) => setAccountStatus(event.target.value as AccountStatus)}
            options={accountStatusOptions}
          />
        )}

        {currentUser.userType === 'MANAGER' && !adminRecord && (
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
            <RoleCheckboxGroup value={managerRoles} onChange={setManagerRoles} />
          </div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          <Input label="Latest Access Link" value={currentUser.lastInviteReference ?? ''} readOnly />
          <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-body)' }}>
            The user can open this link, then set their own password or continue with Google.
          </p>
          <div style={{ display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--text-body)' }}>
            <span>Last sent: {currentUser.lastInviteSentAt ? new Date(currentUser.lastInviteSentAt).toLocaleString() : '-'}</span>
            <span>Count: {currentUser.inviteSendCount}</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              variant="subtle"
              size="sm"
              loading={isCopying}
              disabled={!currentUser.lastInviteReference}
              iconLeft={<Copy size={14} />}
              onClick={() => {
                void handleCopyLink();
              }}
            >
              Copy Link
            </Button>
            <Button
              variant="subtle"
              size="sm"
              loading={isResending}
              iconLeft={<Mail size={14} />}
              onClick={() => {
                void handleResendInvite();
              }}
            >
              New Link
            </Button>
          </div>

          {!adminRecord && (
            <Button
              variant="glass"
              size="sm"
              loading={isSaving}
              iconLeft={<ShieldCheck size={14} />}
              onClick={() => {
                void handleSave();
              }}
            >
              Save
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
