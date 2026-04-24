'use client';

import React from 'react';
import { Mail, Search, Trash2, Upload, UserPlus, X } from 'lucide-react';

import { useAuth } from '@/components/providers/AuthProvider';
import { AdminConfirmDialog } from '@/components/screens/admin/AdminConfirmDialog';
import { BulkStudentImportDialog } from '@/components/screens/admin/BulkStudentImportDialog';
import { CreateUserPanel } from '@/components/screens/admin/CreateUserPanel';
import { UserStatsGrid } from '@/components/screens/admin/UserStatsGrid';
import { UserTableCard, roleTabs, type RoleTab } from '@/components/screens/admin/UserTableCard';
import { Alert, Button, Card, Input, Skeleton, Tabs } from '@/components/ui';
import { deleteUser, getErrorMessage, getUser, listUsers, resendInvite } from '@/lib/api-client';
import type { AccountStatus, UserResponse } from '@/lib/api-types';

type PendingUserAction = {
  type: 'reinvite' | 'delete';
  user: UserResponse;
} | null;

type ActionNotice = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type ReloadUserOptions = {
  email?: string;
  roleTab?: RoleTab;
  statusFilter?: AccountStatus | '';
};

export function AdminUsersScreen({ currentUser }: { currentUser?: UserResponse }) {
  const { session, appUser } = useAuth();
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
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = React.useState(false);
  const [pendingUserAction, setPendingUserAction] = React.useState<PendingUserAction>(null);
  const [reinvitingUserId, setReinvitingUserId] = React.useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = React.useState<string | null>(null);
  const [actionNotice, setActionNotice] = React.useState<ActionNotice>(null);

  const reloadUsers = React.useCallback(async (options: ReloadUserOptions = {}) => {
    if (!accessToken) {
      setLoadingUsers(false);
      setLoadError('The admin session is unavailable. Please sign in again.');
      return;
    }

    const nextEmail = options.email ?? deferredEmail;
    const nextRoleTab = options.roleTab ?? roleTab;
    const nextStatusFilter = options.statusFilter ?? statusFilter;

    setLoadingUsers(true);
    setLoadError(null);

    try {
      const nextUsers = await listUsers(accessToken, {
        email: nextEmail || undefined,
        userType: nextRoleTab === 'ALL' ? '' : nextRoleTab,
        accountStatus: nextStatusFilter,
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

  async function handleReinviteUser(targetUser: UserResponse) {
    if (!accessToken) {
      setActionNotice({ variant: 'error', title: 'Session unavailable', message: 'Please sign in again.' });
      return;
    }

    if (targetUser.accountStatus === 'SUSPENDED') {
      setActionNotice({ variant: 'warning', title: 'Action blocked', message: 'Suspended users cannot receive new links.' });
      return;
    }

    setActionNotice(null);
    setReinvitingUserId(targetUser.id);
    try {
      await resendInvite(accessToken, targetUser.id);
      const refreshed = await getUser(accessToken, targetUser.id);
      setUsers((current) => current.map((user) => (user.id === refreshed.id ? refreshed : user)));
    } catch (error) {
      setActionNotice({ variant: 'error', title: 'Email send failed', message: getErrorMessage(error, 'We could not send a new sign-in email.') });
    } finally {
      setReinvitingUserId(null);
    }
  }

  async function handleDeleteUser(targetUser: UserResponse) {
    if (!accessToken) {
      setActionNotice({ variant: 'error', title: 'Session unavailable', message: 'Please sign in again.' });
      return;
    }

    if (resolvedUser?.id === targetUser.id) {
      setActionNotice({ variant: 'warning', title: 'Action blocked', message: 'You cannot delete your own account.' });
      return;
    }

    setActionNotice(null);
    setDeletingUserId(targetUser.id);
    try {
      await deleteUser(accessToken, targetUser.id);
      setUsers((current) => current.filter((user) => user.id !== targetUser.id));
    } catch (error) {
      setActionNotice({ variant: 'error', title: 'Delete failed', message: getErrorMessage(error, 'Could not delete this user.') });
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

        {actionNotice && (
          <Alert variant={actionNotice.variant} title={actionNotice.title}>
            {actionNotice.message}
          </Alert>
        )}

        <UserStatsGrid
          totalUsers={totalUsers}
          activeUsers={activeUsers}
          pendingInvites={pendingInvites}
          newThisWeek={newThisWeek}
        />

        <Tabs
          variant="pill"
          tabs={roleTabs.map((t) => ({ value: t.value, label: t.label }))}
          value={roleTab}
          onChange={(v) => setRoleTab(v as RoleTab)}
        />

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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="subtle"
              size="sm"
              iconLeft={<Upload size={14} />}
              onClick={() => setIsBulkImportDialogOpen(true)}
            >
              Import Students
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<UserPlus size={14} />}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Add User
            </Button>
          </div>
        </div>

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

      {pendingUserAction && (
        <AdminConfirmDialog
          open
          title={pendingUserAction.type === 'delete' ? 'Delete user?' : 'Reinvite user?'}
          description={
            pendingUserAction.type === 'delete'
              ? 'This permanently removes the account and linked identity when one exists.'
              : 'This sends a fresh sign-in email and updates the user invite metadata.'
          }
          confirmLabel={pendingUserAction.type === 'delete' ? 'Delete User' : 'Send Email'}
          confirmVariant={pendingUserAction.type === 'delete' ? 'danger' : 'primary'}
          confirmIcon={pendingUserAction.type === 'delete' ? <Trash2 size={14} /> : <Mail size={14} />}
          loading={
            pendingUserAction.type === 'delete'
              ? deletingUserId === pendingUserAction.user.id
              : reinvitingUserId === pendingUserAction.user.id
          }
          alertVariant={pendingUserAction.type === 'delete' ? 'warning' : 'info'}
          onClose={() => setPendingUserAction(null)}
          onConfirm={() => {
            void handleConfirmPendingUserAction();
          }}
        >
          <div style={{ display: 'grid', gap: 8, color: 'var(--text-body)', fontSize: 13 }}>
            <span>
              <strong style={{ color: 'var(--text-h)' }}>Email:</strong> {pendingUserAction.user.email}
            </span>
            <span>
              <strong style={{ color: 'var(--text-h)' }}>Status:</strong> {pendingUserAction.user.accountStatus}
            </span>
          </div>
        </AdminConfirmDialog>
      )}

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
                onCreated={async () => {
                  setEmailFilter('');
                  await reloadUsers({ email: '', roleTab, statusFilter });
                  setIsCreateDialogOpen(false);
                }}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </Card>
          </div>
        </div>
      )}

      <BulkStudentImportDialog
        open={isBulkImportDialogOpen}
        accessToken={accessToken}
        onClose={() => setIsBulkImportDialogOpen(false)}
        onImported={async () => {
          setActionNotice(null);
          setEmailFilter('');
          setStatusFilter('');
          setRoleTab('STUDENT');
          await reloadUsers({ email: '', roleTab: 'STUDENT', statusFilter: '' });
        }}
      />
    </>
  );
}
