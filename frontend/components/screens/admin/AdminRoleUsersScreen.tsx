'use client';

import React from 'react';
import { Copy, Eye, Search, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { CreateUserPanel } from '@/components/screens/admin/CreateUserPanel';
import { UserIdentityCell } from '@/components/screens/admin/UserIdentityCell';
import { UserStatsGrid } from '@/components/screens/admin/UserStatsGrid';
import {
  Alert,
  Button,
  Card,
  Chip,
  Input,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@/components/ui';
import { getErrorMessage, listUsers } from '@/lib/api-client';
import type { AccountStatus, UserResponse, UserType } from '@/lib/api-types';
import { getStudentFacultyLabel } from '@/lib/student-catalog';
import {
  getAccountStatusChipColor,
  getAccountStatusLabel,
  getManagerRoleInitials,
  getManagerRoleLabel,
  getUserAvatarInitials,
  getUserDisplayName,
  getUserTypeChipColor,
  getUserTypeLabel,
} from '@/lib/user-display';

type NoticeState = {
  variant: 'error' | 'success' | 'warning' | 'info' | 'neutral';
  title: string;
  message: string;
} | null;

type CreatedInviteState = {
  email: string;
  link: string;
} | null;

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const roleConfig: Record<UserType, { title: string; eyebrow: string; description: string; detailBase: string }> = {
  STUDENT: {
    title: 'Students',
    eyebrow: 'Manage',
    description: 'Review student onboarding, identity, registration, and account access.',
    detailBase: '/admin/students',
  },
  FACULTY: {
    title: 'Faculty',
    eyebrow: 'Manage',
    description: 'Manage academic staff profiles, departments, designations, and account access.',
    detailBase: '/admin/faculty',
  },
  MANAGER: {
    title: 'Managers',
    eyebrow: 'Manage',
    description: 'Manage operational manager profiles, assigned manager roles, and lifecycle actions.',
    detailBase: '/admin/managers',
  },
  ADMIN: {
    title: 'Admins',
    eyebrow: 'Manage',
    description: 'Manage administrator profiles and protected console access.',
    detailBase: '/admin/admins',
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function roleSpecificCells(user: UserResponse) {
  if (user.userType === 'STUDENT') {
    return (
      <>
        <TableCell style={{ padding: '12px 20px', color: 'var(--text-body)', fontSize: 12 }}>
          {user.studentProfile?.registrationNumber || '-'}
        </TableCell>
        <TableCell style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
          {getStudentFacultyLabel(user.studentProfile?.facultyName) || '-'}
        </TableCell>
        <TableCell style={{ padding: '12px 20px' }}>
          <Chip color={user.studentProfile?.onboardingCompleted ? 'green' : 'orange'} dot>
            {user.studentProfile?.onboardingCompleted ? 'Complete' : 'Pending'}
          </Chip>
        </TableCell>
      </>
    );
  }

  if (user.userType === 'FACULTY') {
    return (
      <>
        <TableCell style={{ padding: '12px 20px', color: 'var(--text-body)', fontSize: 12 }}>
          {user.facultyProfile?.employeeNumber || '-'}
        </TableCell>
        <TableCell style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
          {user.facultyProfile?.department || '-'}
        </TableCell>
        <TableCell style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
          {user.facultyProfile?.designation || '-'}
        </TableCell>
      </>
    );
  }

  if (user.userType === 'MANAGER') {
    return (
      <>
        <TableCell style={{ padding: '12px 20px', color: 'var(--text-body)', fontSize: 12 }}>
          {user.managerProfile?.employeeNumber || '-'}
        </TableCell>
        <TableCell style={{ padding: '12px 20px' }}>
          {user.managerRole ? (
            <Chip color="blue" dot>
              {getManagerRoleLabel(user.managerRole)}
            </Chip>
          ) : (
            '-'
          )}
        </TableCell>
      </>
    );
  }

  return (
    <TableCell style={{ padding: '12px 20px', color: 'var(--text-body)', fontSize: 12 }}>
      {user.adminProfile?.employeeNumber || '-'}
    </TableCell>
  );
}

function roleSpecificHeaders(userType: UserType) {
  if (userType === 'STUDENT') return ['Registration', 'Faculty', 'Onboarding'];
  if (userType === 'FACULTY') return ['Employee #', 'Department', 'Designation'];
  if (userType === 'MANAGER') return ['Employee #', 'Manager Role'];
  return ['Employee #'];
}

export function AdminRoleUsersScreen({ userType }: { userType: UserType }) {
  const router = useRouter();
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const config = roleConfig[userType];

  const [emailFilter, setEmailFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<AccountStatus | ''>('');
  const deferredEmail = React.useDeferredValue(emailFilter);
  const [users, setUsers] = React.useState<UserResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<NoticeState>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [createdInvite, setCreatedInvite] = React.useState<CreatedInviteState>(null);
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
        userType,
        accountStatus: statusFilter,
      });
      setUsers(nextUsers);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load users.'));
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [accessToken, deferredEmail, statusFilter, userType]);

  React.useEffect(() => {
    void reloadUsers();
  }, [reloadUsers]);

  function handleCopyGeneratedLink() {
    if (!createdInvite?.link) return;
    startCopyLinkTransition(async () => {
      try {
        await navigator.clipboard.writeText(createdInvite.link);
        setNotice({ variant: 'success', title: 'Copied', message: 'Access link copied to clipboard.' });
      } catch {
        setNotice({ variant: 'error', title: 'Copy failed', message: 'Could not copy the access link.' });
      }
    });
  }

  const now = Date.now();
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.accountStatus === 'ACTIVE').length;
  const pendingInvites = users.filter((u) => u.accountStatus === 'INVITED').length;
  const newThisWeek = users.filter((u) => now - new Date(u.invitedAt).getTime() < ONE_WEEK_MS).length;
  const headers = roleSpecificHeaders(userType);
  const showAccessDateColumns = userType !== 'STUDENT';

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
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
              {config.eyebrow}
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
              {config.title}
            </h1>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
              {config.description}
            </p>
          </div>
          <Chip color={getUserTypeChipColor(userType)} dot>
            {getUserTypeLabel(userType)}
          </Chip>
        </div>

        {notice && (
          <Alert variant={notice.variant} title={notice.title}>
            {notice.message}
          </Alert>
        )}

        <UserStatsGrid
          totalUsers={totalUsers}
          activeUsers={activeUsers}
          pendingInvites={pendingInvites}
          newThisWeek={newThisWeek}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 240, maxWidth: '100%' }}>
            <Input
              label=""
              id={`admin-${userType.toLowerCase()}-search`}
              name={`admin-${userType.toLowerCase()}-search`}
              type="search"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              placeholder="Search by email..."
              autoComplete="off"
              iconLeft={<Search size={15} />}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Select
              label=""
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AccountStatus | '')}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INVITED', label: 'Invited' },
                { value: 'SUSPENDED', label: 'Suspended' },
              ]}
            />
            <Button
              variant="primary"
              size="sm"
              iconLeft={<UserPlus size={14} />}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Add {getUserTypeLabel(userType)}
            </Button>
          </div>
        </div>

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
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-h)' }}>
                No {config.title.toLowerCase()} found
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 0' }}>
                Try adjusting search or status filters.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow hoverable={false}>
                    <TableHeader style={{ background: 'var(--surface-2)', padding: '12px 20px' }}>
                      Name / Identity
                    </TableHeader>
                    {headers.map((header) => (
                      <TableHeader key={header} style={{ background: 'var(--surface-2)', padding: '12px 20px' }}>
                        {header}
                      </TableHeader>
                    ))}
                    {showAccessDateColumns && (
                      <>
                        <TableHeader style={{ background: 'var(--surface-2)', padding: '12px 20px' }}>
                          Last Login
                        </TableHeader>
                        <TableHeader style={{ background: 'var(--surface-2)', padding: '12px 20px' }}>
                          Invited
                        </TableHeader>
                      </>
                    )}
                    <TableHeader style={{ background: 'var(--surface-2)', padding: '12px 20px' }}>
                      Status
                    </TableHeader>
                    <TableHeader style={{ background: 'var(--surface-2)', padding: '12px 20px', textAlign: 'right' }}>
                      Actions
                    </TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell style={{ padding: '12px 20px' }}>
                        <UserIdentityCell
                          name={getUserDisplayName(user)}
                          email={user.email}
                          initials={user.userType === 'MANAGER' ? getManagerRoleInitials(user.managerRole) : getUserAvatarInitials(user)}
                          src={user.userType === 'STUDENT' ? user.studentProfile?.profileImageUrl : undefined}
                        />
                      </TableCell>
                      {roleSpecificCells(user)}
                      {showAccessDateColumns && (
                        <>
                          <TableCell style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
                            {formatDate(user.lastLoginAt)}
                          </TableCell>
                          <TableCell style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
                            {formatDate(user.invitedAt)}
                          </TableCell>
                        </>
                      )}
                      <TableCell style={{ padding: '12px 20px' }}>
                        <Chip color={getAccountStatusChipColor(user.accountStatus)} dot>
                          {getAccountStatusLabel(user.accountStatus)}
                        </Chip>
                      </TableCell>
                      <TableCell style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <Button
                          variant="subtle"
                          size="xs"
                          iconLeft={<Eye size={12} />}
                          onClick={() => router.push(`${config.detailBase}/${user.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

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
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <p id="admin-create-user-title" style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-h)' }}>
                    Add {getUserTypeLabel(userType)}
                  </p>
                  <p style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-body)' }}>
                    Create the account and generate its first access link.
                  </p>
                </div>
                <button type="button" className="admin-dialog-close" aria-label="Close" onClick={() => setIsCreateDialogOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <CreateUserPanel
                embedded
                accessToken={accessToken}
                fixedUserType={userType}
                onCreated={async (createdUser) => {
                  setEmailFilter('');
                  await reloadUsers();
                  setIsCreateDialogOpen(false);
                  if (createdUser.lastInviteReference) {
                    setCreatedInvite({ email: createdUser.email, link: createdUser.lastInviteReference });
                  }
                }}
                onNotice={setNotice}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </Card>
          </div>
        </div>
      )}

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
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
                <div>
                  <p id="admin-generated-link-title" style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-h)' }}>
                    Generated Link
                  </p>
                  <p style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-body)' }}>
                    Share or test this generated access link.
                  </p>
                </div>
                <button type="button" className="admin-dialog-close" aria-label="Close" onClick={() => setCreatedInvite(null)}>
                  <X size={16} />
                </button>
              </div>
              <Input label="User Email" value={createdInvite.email} readOnly />
              <Textarea
                label="Generated Access Link"
                value={createdInvite.link}
                readOnly
                rows={5}
                resize="none"
                style={{ marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                <Button variant="subtle" size="sm" loading={isCopyingLink} iconLeft={<Copy size={14} />} onClick={handleCopyGeneratedLink}>
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
