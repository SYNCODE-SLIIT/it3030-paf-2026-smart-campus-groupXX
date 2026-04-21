'use client';

import React from 'react';
import { AlertTriangle, Copy, Mail, Search, Trash2, UserPlus, X } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { CreateUserPanel } from '@/components/screens/admin/CreateUserPanel';
import { UserStatsGrid } from '@/components/screens/admin/UserStatsGrid';
import { UserTableCard, roleTabs, type RoleTab } from '@/components/screens/admin/UserTableCard';
import { Alert, Button, Card, Input, Skeleton, Tabs, Textarea, Toast, ToastStack } from '@/components/ui';
import { deleteUser, getErrorMessage, getUser, listUsers, resendInvite } from '@/lib/api-client';
import type { AccountStatus, UserResponse } from '@/lib/api-types';

type CreatedInviteState = {
  email: string;
  link: string;
} | null;

type PendingUserAction = {
  type: 'reinvite' | 'delete';
  user: UserResponse;
} | null;

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function AdminUsersScreen({ currentUser }: { currentUser?: UserResponse }) {
  const { session, appUser } = useAuth();
  const { showToast } = useToast();
  const resolvedUser = currentUser ?? appUser ?? null;
  const accessToken = session?.access_token ?? null;

  const [roleTab, setRoleTab] = React.useState<RoleTab>('ALL');
  const [emailFilter, setEmailFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<AccountStatus | ''>('');
  const deferredEmail = React.useDeferredValue(emailFilter);

  const [users, setUsers] = React.useState<UserResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [createdInvite, setCreatedInvite] = React.useState<CreatedInviteState>(null);
  const [pendingUserAction, setPendingUserAction] = React.useState<PendingUserAction>(null);
  const [reinvitingUserId, setReinvitingUserId] = React.useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = React.useState<string | null>(null);
  const [isCopyingLink, startCopyLinkTransition] = React.useTransition();

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
        accountStatus: statusFilter,
      });
      setUsers(nextUsers);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load users.'));
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [accessToken, deferredEmail, roleTab, statusFilter]);

  React.useEffect(() => {
    void reloadUsers();
  }, [reloadUsers]);

  React.useEffect(() => {
    if (!isCreateDialogOpen && !createdInvite) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (createdInvite) { setCreatedInvite(null); return; }
      setIsCreateDialogOpen(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createdInvite, isCreateDialogOpen]);


  function handleCopyGeneratedLink() {
    if (!createdInvite?.link) return;
    startCopyLinkTransition(async () => {
      try {
        await navigator.clipboard.writeText(createdInvite.link);
        showToast('success', 'Copied', 'Access link copied to clipboard.');
      } catch {
        showToast('error', 'Copy failed', 'Could not copy the access link.');
      }
    });
  }

  async function handleReinviteUser(targetUser: UserResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    if (targetUser.accountStatus === 'SUSPENDED') {
      showToast('warning', 'Action blocked', 'Suspended users cannot receive new links.');
      return;
    }

    setReinvitingUserId(targetUser.id);
    try {
      await resendInvite(accessToken, targetUser.id);
      const refreshed = await getUser(accessToken, targetUser.id);
      setUsers((current) => current.map((user) => (user.id === refreshed.id ? refreshed : user)));
      showToast('success', 'Access link generated', `A fresh access link is ready for ${targetUser.email}.`);
    } catch (error) {
      showToast('error', 'Link generation failed', getErrorMessage(error, 'We could not generate a new access link.'));
    } finally {
      setReinvitingUserId(null);
    }
  }

  async function handleDeleteUser(targetUser: UserResponse) {
    if (!accessToken) {
      showToast('error', 'Session unavailable', 'Please sign in again.');
      return;
    }

    if (resolvedUser?.id === targetUser.id) {
      showToast('warning', 'Action blocked', 'You cannot delete your own account.');
      return;
    }

    setDeletingUserId(targetUser.id);
    try {
      await deleteUser(accessToken, targetUser.id);
      setUsers((current) => current.filter((user) => user.id !== targetUser.id));
      showToast('success', 'User deleted', `${targetUser.email} was removed.`);
    } catch (error) {
      showToast('error', 'Delete failed', getErrorMessage(error, 'Could not delete this user.'));
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleConfirmPendingUserAction() {
    if (!pendingUserAction) return;

    const action = pendingUserAction;
    if (action.type === 'delete') {
      await handleDeleteUser(action.user);
    } else {
      await handleReinviteUser(action.user);
    }
    setPendingUserAction(null);
  }

  // Derive stats from loaded users
  const now = Date.now();
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.accountStatus === 'ACTIVE').length;
  const pendingInvites = users.filter((u) => u.accountStatus === 'INVITED').length;
  const newThisWeek = users.filter((u) => now - new Date(u.invitedAt).getTime() < ONE_WEEK_MS).length;

  if (!resolvedUser) {
    return (
      <Card>
        <div style={{ display: 'grid', gap: 12 }}>
          <Skeleton variant="line" height={20} width="35%" />
          <Skeleton variant="rect" height={52} />
          <Skeleton variant="rect" height={220} />
        </div>
      </Card>
    );
  }

  return (
    <>
      <style>{`
        .admin-dialog-overlay {
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
        .admin-dialog-shell {
          width: min(100%, 720px);
          max-height: calc(100vh - 48px);
          overflow-y: auto;
        }
        .admin-dialog-close {
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
          transition: background .15s, transform .15s;
        }
        .admin-dialog-close:hover {
          background: rgba(238,202,68,.12);
          transform: translateY(-1px);
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Page header */}
        <div>
          <p
            style={{
              margin: '0 0 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '.35em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            System Console
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: 0,
              lineHeight: 1.1,
              color: 'var(--text-h)',
            }}
          >
            User Management
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
            Manage roles and account lifecycle — invite, deactivate, and remove users.
          </p>
        </div>

        {/* Stats */}
        <UserStatsGrid
          totalUsers={totalUsers}
          activeUsers={activeUsers}
          pendingInvites={pendingInvites}
          newThisWeek={newThisWeek}
        />

        {/* Role tabs */}
        <Tabs
          variant="pill"
          tabs={roleTabs.map((t) => ({ value: t.value, label: t.label }))}
          value={roleTab}
          onChange={(v) => setRoleTab(v as RoleTab)}
        />

        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ width: 240, maxWidth: '100%' }}>
            <Input
              label=""
              id="admin-user-search"
              name="admin-user-search"
              type="search"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              placeholder="Search users by email..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              iconLeft={<Search size={15} />}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            iconLeft={<UserPlus size={14} />}
            onClick={() => setIsCreateDialogOpen(true)}
          >
            Add User
          </Button>
        </div>

        {/* Table */}
        <UserTableCard
          users={users}
          loading={loadingUsers}
          error={loadError}
          roleTab={roleTab}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onReinviteUser={(user) => {
            setPendingUserAction({ type: 'reinvite', user });
          }}
          onDeleteUser={(user) => {
            setPendingUserAction({ type: 'delete', user });
          }}
          reinvitingUserId={reinvitingUserId}
          deletingUserId={deletingUserId}
          currentUserId={resolvedUser?.id ?? null}
        />
      </div>

      <ToastStack>
        {pendingUserAction && (
          <Toast
            variant={pendingUserAction.type === 'delete' ? 'warning' : 'info'}
            title={pendingUserAction.type === 'delete' ? 'Confirm delete user' : 'Confirm reinvite user'}
            icon={pendingUserAction.type === 'delete' ? <AlertTriangle size={18} /> : <Mail size={18} />}
            dismissible
            onDismiss={() => setPendingUserAction(null)}
            actions={
              <>
                <Button variant="ghost" size="xs" onClick={() => setPendingUserAction(null)}>
                  Cancel
                </Button>
                <Button
                  variant={pendingUserAction.type === 'delete' ? 'danger' : 'primary'}
                  size="xs"
                  iconLeft={pendingUserAction.type === 'delete' ? <Trash2 size={12} /> : <Mail size={12} />}
                  loading={
                    pendingUserAction.type === 'delete'
                      ? deletingUserId === pendingUserAction.user.id
                      : reinvitingUserId === pendingUserAction.user.id
                  }
                  onClick={() => { void handleConfirmPendingUserAction(); }}
                >
                  Confirm
                </Button>
              </>
            }
          >
            {pendingUserAction.type === 'delete'
              ? `Delete ${pendingUserAction.user.email}? This permanently removes the account.`
              : `Generate a fresh access link for ${pendingUserAction.user.email}?`}
          </Toast>
        )}
      </ToastStack>

      {/* Create user dialog */}
      {isCreateDialogOpen && (
        <div className="admin-dialog-overlay" onClick={() => setIsCreateDialogOpen(false)}>
          <div
            className="admin-dialog-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-create-user-title"
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  alignItems: 'flex-start',
                  marginBottom: 20,
                }}
              >
                <div>
                  <p
                    id="admin-create-user-title"
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
                    Create the account and copy the generated link to test sign-in right away.
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-dialog-close"
                  aria-label="Close"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <CreateUserPanel
                embedded
                accessToken={accessToken}
                onCreated={async (createdUser) => {
                  setEmailFilter('');
                  await reloadUsers();
                  setIsCreateDialogOpen(false);
                  if (createdUser.lastInviteReference) {
                    setCreatedInvite({ email: createdUser.email, link: createdUser.lastInviteReference });
                    return;
                  }
                  showToast('warning', 'User created', 'No access link was returned.');
                }}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </Card>
          </div>
        </div>
      )}

      {/* Generated link dialog */}
      {createdInvite && (
        <div className="admin-dialog-overlay" onClick={() => setCreatedInvite(null)}>
          <div
            className="admin-dialog-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-generated-link-title"
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  alignItems: 'flex-start',
                  marginBottom: 18,
                }}
              >
                <div>
                  <p
                    id="admin-generated-link-title"
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
                    Open this link in a private window to test the new user sign-in flow.
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-dialog-close"
                  aria-label="Close"
                  onClick={() => setCreatedInvite(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <Alert variant="success" title="User created" style={{ marginBottom: 16 }}>
                The access link is ready. Open it in a private window so it does not interfere with your admin session.
              </Alert>

              <div style={{ display: 'grid', gap: 14 }}>
                <Input
                  label="User Email"
                  id="generated-invite-email"
                  name="generated-invite-email"
                  value={createdInvite.email}
                  readOnly
                  autoComplete="off"
                />
                <Textarea
                  label="Generated Access Link"
                  value={createdInvite.link}
                  readOnly
                  rows={5}
                  resize="none"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5 }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginTop: 18,
                }}
              >
                <Button
                  variant="subtle"
                  size="sm"
                  loading={isCopyingLink}
                  iconLeft={<Copy size={14} />}
                  onClick={handleCopyGeneratedLink}
                >
                  Copy Link
                </Button>
                <Button variant="primary" size="sm" onClick={() => setCreatedInvite(null)}>
                  Done
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
