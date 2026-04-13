'use client';

import React from 'react';
import { Copy, RefreshCw, Search, Trash2, UserPlus, X } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { CreateUserPanel } from '@/components/screens/admin/CreateUserPanel';
import { Alert, Button, Card, Chip, GlassPill, Input, Select, Skeleton, Textarea } from '@/components/ui';
import { deleteUser, getErrorMessage, listUsers } from '@/lib/api-client';
import type { AccountStatus, UserResponse, UserType } from '@/lib/api-types';
import {
  getAccountStatusChipColor,
  getAccountStatusLabel,
  getUserTypeChipColor,
  getUserTypeLabel,
} from '@/lib/user-display';

type RoleTab = 'ALL' | UserType;

type NoticeState =
  | {
      variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
      title: string;
      message: string;
    }
  | null;

const roleTabs: Array<{ value: RoleTab; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'MANAGER', label: 'Managers' },
];

type CreatedInviteState = {
  email: string;
  userType: UserType;
  link: string;
} | null;

export function AdminUsersScreen({ currentUser }: { currentUser?: UserResponse }) {
  const { session, appUser } = useAuth();
  const resolvedUser = currentUser ?? appUser ?? null;
  const accessToken = session?.access_token ?? null;
  const [roleTab, setRoleTab] = React.useState<RoleTab>('ALL');
  const [emailFilter, setEmailFilter] = React.useState('');
  const [accountStatus, setAccountStatus] = React.useState<AccountStatus | ''>('');
  const deferredEmail = React.useDeferredValue(emailFilter);
  const [users, setUsers] = React.useState<UserResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<NoticeState>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [createdInvite, setCreatedInvite] = React.useState<CreatedInviteState>(null);
  const [isRefreshing, startRefreshTransition] = React.useTransition();
  const [isCopyingLink, startCopyLinkTransition] = React.useTransition();
  const [deletingUserId, setDeletingUserId] = React.useState<string | null>(null);
  const showStudentOnboardingColumn = roleTab === 'STUDENT';

  const reloadUsers = React.useCallback(async () => {
    if (!accessToken) {
      setLoadingUsers(false);
      setLoadError('The admin session is unavailable. Please sign in again.');
      return;
    }

    setLoadingUsers(true);
    setLoadError(null);

    try {
      const nextUsers = await listUsers(accessToken, {
        email: deferredEmail || undefined,
        userType: roleTab === 'ALL' ? '' : roleTab,
        accountStatus,
      });

      setUsers(nextUsers);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load users.'));
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [accessToken, accountStatus, deferredEmail, roleTab]);

  React.useEffect(() => {
    void reloadUsers();
  }, [reloadUsers]);

  React.useEffect(() => {
    if (!isCreateDialogOpen && !createdInvite) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (createdInvite) {
        setCreatedInvite(null);
        return;
      }

      setIsCreateDialogOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [createdInvite, isCreateDialogOpen]);

  function handleCopyGeneratedLink() {
    if (!createdInvite?.link) {
      return;
    }

    startCopyLinkTransition(async () => {
      try {
        await navigator.clipboard.writeText(createdInvite.link);
        setNotice({
          variant: 'success',
          title: 'Copied',
          message: 'Generated access link copied to clipboard.',
        });
      } catch {
        setNotice({
          variant: 'error',
          title: 'Copy failed',
          message: 'Could not copy the generated access link.',
        });
      }
    });
  }

  async function handleDeleteUser(user: UserResponse) {
    if (!accessToken) {
      setNotice({
        variant: 'error',
        title: 'Session unavailable',
        message: 'The admin session is unavailable. Please sign in again.',
      });
      return;
    }

    if (resolvedUser && user.id === resolvedUser.id) {
      setNotice({
        variant: 'warning',
        title: 'Action blocked',
        message: 'You cannot delete your own admin account.',
      });
      return;
    }

    const confirmed = window.confirm(
      `Delete ${user.email} from Smart Campus? This permanently removes the account and associated auth identity.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingUserId(user.id);
    try {
      await deleteUser(accessToken, user.id);
      await reloadUsers();
      setNotice({
        variant: 'success',
        title: 'User deleted',
        message: `${user.email} was removed from the system.`,
      });
    } catch (error) {
      setNotice({
        variant: 'error',
        title: 'Delete failed',
        message: getErrorMessage(error, 'We could not delete this user right now.'),
      });
    } finally {
      setDeletingUserId(null);
    }
  }

  if (!resolvedUser) {
    return null;
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <style>{`
        .admin-users-layout {
          display: grid;
          gap: 16px;
        }

        .admin-users-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .admin-users-table thead th {
          text-align: left;
          padding: 12px 14px;
          font-family: var(--font-mono);
          font-size: 8px;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }

        .admin-users-table tbody td {
          padding: 14px;
          border-bottom: 1px solid rgba(20,18,12,.08);
          color: var(--text-body);
          vertical-align: middle;
        }

        .admin-users-table tbody tr {
          transition: background .15s ease;
        }

        .admin-users-table tbody tr:hover {
          background: rgba(238,202,68,.06);
        }

        .admin-users-dialog-overlay {
          position: fixed;
          inset: 0;
          z-index: 70;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(20, 18, 12, 0.44);
          backdrop-filter: blur(10px);
        }

        .admin-users-dialog-shell {
          width: min(100%, 720px);
          max-height: calc(100vh - 48px);
          overflow-y: auto;
        }

        .admin-users-dialog-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--surface-2);
          color: var(--text-body);
          cursor: pointer;
          transition: background .15s ease, transform .15s ease;
        }

        .admin-users-dialog-close:hover {
          background: rgba(238,202,68,.12);
          transform: translateY(-1px);
        }

        @media (max-width: 1120px) {
          .admin-users-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--text-h)',
            }}
          >
            Users
          </h1>
        </div>
        <Button
          variant="glass"
          size="sm"
          iconLeft={<UserPlus size={14} />}
          onClick={() => setIsCreateDialogOpen(true)}
        >
          Add User
        </Button>
      </div>

      {notice && (
        <Alert variant={notice.variant} title={notice.title}>
          {notice.message}
        </Alert>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        <GlassPill
          style={{
            padding: 14,
            display: 'grid',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {roleTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setRoleTab(tab.value)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 999,
                  padding: '10px 14px',
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '.04em',
                  background: roleTab === tab.value ? 'rgba(238,202,68,.92)' : 'rgba(255,255,255,.72)',
                  color: roleTab === tab.value ? 'var(--yellow-900)' : 'var(--text-body)',
                  boxShadow: roleTab === tab.value ? '0 8px 18px rgba(238,202,68,.22)' : 'none',
                  transition: 'background .15s ease, transform .15s ease, box-shadow .15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Input
              label="Search"
              value={emailFilter}
              onChange={(event) => setEmailFilter(event.target.value)}
              placeholder="Email"
              iconLeft={<Search size={16} />}
              style={{ flex: 1, minWidth: 220 }}
            />
            <Select
              label="Status"
              value={accountStatus}
              onChange={(event) => setAccountStatus(event.target.value as AccountStatus | '')}
              options={[
                { value: '', label: 'All' },
                { value: 'INVITED', label: 'Invited' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'SUSPENDED', label: 'Suspended' },
              ]}
            />
            <Button
              variant="subtle"
              size="sm"
              loading={isRefreshing}
              iconLeft={<RefreshCw size={14} />}
              onClick={() => {
                startRefreshTransition(async () => {
                  await reloadUsers();
                });
              }}
            >
              Refresh
            </Button>
          </div>
        </GlassPill>

        <div className="admin-users-layout">
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {loadError ? (
              <div style={{ padding: 18 }}>
                <Alert variant="error" title="Directory unavailable">
                  {loadError}
                </Alert>
              </div>
            ) : loadingUsers ? (
              <div style={{ display: 'grid', gap: 10, padding: 16 }}>
                <Skeleton variant="rect" height={54} />
                <Skeleton variant="rect" height={54} />
                <Skeleton variant="rect" height={54} />
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: 18 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>
                  No users found
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      {showStudentOnboardingColumn ? <th>Onboarding</th> : null}
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.email}</td>
                        <td>
                          <Chip color={getUserTypeChipColor(user.userType)} dot>
                            {getUserTypeLabel(user.userType)}
                          </Chip>
                        </td>
                        <td>
                          <Chip color={getAccountStatusChipColor(user.accountStatus)} dot>
                            {getAccountStatusLabel(user.accountStatus)}
                          </Chip>
                        </td>
                        {showStudentOnboardingColumn ? (
                          <td>{user.userType === 'STUDENT' ? (user.studentProfile?.onboardingCompleted ? 'Complete' : 'Pending') : '-'}</td>
                        ) : null}
                        <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '-'}</td>
                        <td>
                          <Button
                            variant="ghost-danger"
                            size="xs"
                            loading={deletingUserId === user.id}
                            disabled={resolvedUser?.id === user.id}
                            iconLeft={<Trash2 size={12} />}
                            onClick={() => {
                              void handleDeleteUser(user);
                            }}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {isCreateDialogOpen && (
        <div className="admin-users-dialog-overlay" onClick={() => setIsCreateDialogOpen(false)}>
          <div
            className="admin-users-dialog-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-users-create-title"
            onClick={(event) => event.stopPropagation()}
          >
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <p
                    id="admin-users-create-title"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 24,
                      fontWeight: 700,
                      color: 'var(--text-h)',
                    }}
                  >
                    Add User
                  </p>
                  <p style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-body)' }}>
                    Create the account here, then copy the generated link to test sign-in right away. Student accounts can continue to onboarding from the same link.
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-users-dialog-close"
                  aria-label="Close add user dialog"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <CreateUserPanel
                embedded
                accessToken={accessToken}
                onCreated={async (createdUser) => {
                  await reloadUsers();
                  setIsCreateDialogOpen(false);

                  if (createdUser.lastInviteReference) {
                    setCreatedInvite({
                      email: createdUser.email,
                      userType: createdUser.userType,
                      link: createdUser.lastInviteReference,
                    });
                    return;
                  }

                  setNotice({
                    variant: 'warning',
                    title: 'User created',
                    message: 'The user was created, but no generated access link was returned.',
                  });
                }}
                onNotice={setNotice}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </Card>
          </div>
        </div>
      )}

      {createdInvite && (
        <div className="admin-users-dialog-overlay" onClick={() => setCreatedInvite(null)}>
          <div
            className="admin-users-dialog-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-users-generated-link-title"
            onClick={(event) => event.stopPropagation()}
          >
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
                <div>
                  <p
                    id="admin-users-generated-link-title"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 24,
                      fontWeight: 700,
                      color: 'var(--text-h)',
                    }}
                  >
                    Generated Link
                  </p>
                  <p style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-body)' }}>
                    {createdInvite.userType === 'STUDENT'
                      ? 'Use this link to test the new student login and onboarding flow.'
                      : 'Use this link to test the invited user sign-in flow.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-users-dialog-close"
                  aria-label="Close generated link dialog"
                  onClick={() => setCreatedInvite(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <Alert variant="success" title="User created" style={{ marginBottom: 16 }}>
                The access link is ready. Open it in a private window or another browser session so it does not interfere with the admin login.
              </Alert>

              <div style={{ display: 'grid', gap: 14 }}>
                <Input label="User Email" value={createdInvite.email} readOnly />
                <Textarea
                  label="Generated Access Link"
                  value={createdInvite.link}
                  readOnly
                  rows={5}
                  resize="none"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                <Button
                  variant="subtle"
                  size="sm"
                  loading={isCopyingLink}
                  iconLeft={<Copy size={14} />}
                  onClick={handleCopyGeneratedLink}
                >
                  Copy Link
                </Button>
                <Button variant="glass" size="sm" onClick={() => setCreatedInvite(null)}>
                  Done
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
