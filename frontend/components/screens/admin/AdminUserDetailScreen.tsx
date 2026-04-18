'use client';

import React from 'react';
import { AlertTriangle, ArrowLeft, Copy, Edit3, Mail, Save, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { ProfileFields } from '@/components/screens/admin/ProfileFields';
import { RoleRadioGroup } from '@/components/screens/admin/RoleRadioGroup';
import { Alert, Avatar, Button, Card, Chip, Divider, Input, Select, Skeleton } from '@/components/ui';
import {
  deleteUser,
  getErrorMessage,
  getUser,
  replaceManagerRole,
  resendInvite,
  updateUser,
} from '@/lib/api-client';
import type { AccountStatus, ManagerRole, UpdateUserRequest, UserResponse } from '@/lib/api-types';
import {
  createEmptyAdminForm,
  createEmptyFacultyForm,
  createEmptyManagerForm,
  createEmptyStudentForm,
  adminFormFromUser,
  facultyFormFromUser,
  managerFormFromUser,
  studentFormFromUser,
  toAdminProfileInput,
  toFacultyProfileInput,
  toManagerProfileInput,
  toStudentProfileInput,
} from '@/components/screens/admin/adminUserFormUtils';
import {
  academicYearOptions,
  getStudentFacultyLabel,
  getStudentProgramLabel,
  semesterOptions,
} from '@/lib/student-catalog';
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

type ConfirmAction = 'reinvite' | 'delete' | null;

type DetailSection = {
  title: string;
  items: Array<{ label: string; value: React.ReactNode }>;
};

const accountStatusOptions: Array<{ value: AccountStatus; label: string }> = [
  { value: 'INVITED', label: 'Invited' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function detailListPath(user: UserResponse | null) {
  switch (user?.userType) {
    case 'STUDENT':
      return '/admin/students';
    case 'FACULTY':
      return '/admin/faculty';
    case 'MANAGER':
      return '/admin/managers';
    case 'ADMIN':
      return '/admin/admins';
    default:
      return '/admin/users';
  }
}

function detailListLabel(user: UserResponse | null) {
  switch (user?.userType) {
    case 'STUDENT':
      return 'Back to Students';
    case 'FACULTY':
      return 'Back to Faculty';
    case 'MANAGER':
      return 'Back to Managers';
    case 'ADMIN':
      return 'Back to Admins';
    default:
      return 'Back to Users';
  }
}

function profileImageSrc(user: UserResponse) {
  return user.userType === 'STUDENT' ? user.studentProfile?.profileImageUrl : undefined;
}

function avatarInitials(user: UserResponse) {
  return user.userType === 'MANAGER' ? getManagerRoleInitials(user.managerRole) : getUserAvatarInitials(user);
}

function emptyValue(value: React.ReactNode) {
  return value === null || value === undefined || value === '' ? '-' : value;
}

function optionLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T | null | undefined) {
  return options.find((option) => option.value === value)?.label ?? value ?? '';
}

function buildDetailSections(user: UserResponse): DetailSection[] {
  if (user.userType === 'STUDENT') {
    const profile = user.studentProfile;
    return [
      {
        title: 'Personal Information',
        items: [
          { label: 'Email', value: user.email },
          { label: 'First Name', value: profile?.firstName },
          { label: 'Last Name', value: profile?.lastName },
          { label: 'Preferred Name', value: profile?.preferredName },
          { label: 'Phone Number', value: profile?.phoneNumber },
        ],
      },
      {
        title: 'Academic Enrollment',
        items: [
          { label: 'Registration Number', value: profile?.registrationNumber },
          { label: 'Faculty / School', value: getStudentFacultyLabel(profile?.facultyName) },
          { label: 'Program', value: getStudentProgramLabel(profile?.programName) },
          { label: 'Academic Year', value: optionLabel(academicYearOptions, profile?.academicYear) },
          { label: 'Semester', value: optionLabel(semesterOptions, profile?.semester) },
        ],
      },
      {
        title: 'Student Preferences',
        items: [
          { label: 'Onboarding', value: profile?.onboardingCompleted ? 'Complete' : 'Pending' },
          { label: 'Email Notifications', value: profile?.emailNotificationsEnabled ? 'Enabled' : 'Disabled' },
          { label: 'SMS Notifications', value: profile?.smsNotificationsEnabled ? 'Enabled' : 'Disabled' },
          { label: 'Profile Image', value: profile?.profileImageUrl ? 'Uploaded' : 'Not uploaded' },
        ],
      },
    ];
  }

  if (user.userType === 'FACULTY') {
    const profile = user.facultyProfile;
    return [
      {
        title: 'Personal Information',
        items: [
          { label: 'Email', value: user.email },
          { label: 'First Name', value: profile?.firstName },
          { label: 'Last Name', value: profile?.lastName },
          { label: 'Preferred Name', value: profile?.preferredName },
          { label: 'Phone Number', value: profile?.phoneNumber },
        ],
      },
      {
        title: 'Faculty Profile',
        items: [
          { label: 'Employee Number', value: profile?.employeeNumber },
          { label: 'Department', value: profile?.department },
          { label: 'Designation', value: profile?.designation },
        ],
      },
    ];
  }

  if (user.userType === 'MANAGER') {
    const profile = user.managerProfile;
    return [
      {
        title: 'Personal Information',
        items: [
          { label: 'Email', value: user.email },
          { label: 'First Name', value: profile?.firstName },
          { label: 'Last Name', value: profile?.lastName },
          { label: 'Preferred Name', value: profile?.preferredName },
          { label: 'Phone Number', value: profile?.phoneNumber },
        ],
      },
      {
        title: 'Manager Assignment',
        items: [
          { label: 'Employee Number', value: profile?.employeeNumber },
          { label: 'Manager Role', value: user.managerRole ? getManagerRoleLabel(user.managerRole) : '-' },
          { label: 'Avatar Source', value: 'Role initials' },
        ],
      },
    ];
  }

  const profile = user.adminProfile;
  return [
    {
      title: 'Administrator Profile',
      items: [
        { label: 'Email', value: user.email },
        { label: 'Full Name', value: profile?.fullName },
        { label: 'Phone Number', value: profile?.phoneNumber },
        { label: 'Employee Number', value: profile?.employeeNumber },
      ],
    },
  ];
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="admin-detail-item">
      <span>{label}</span>
      <strong>{emptyValue(value)}</strong>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="admin-meta-item">
      <span>{label}</span>
      <strong>{emptyValue(value)}</strong>
    </div>
  );
}

function ConfirmMessage({
  action,
  disabled,
  loading,
  onCancel,
  onConfirm,
}: {
  action: Exclude<ConfirmAction, null>;
  disabled?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDelete = action === 'delete';

  return (
    <div className="admin-confirm-message" role="status">
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ color: isDelete ? 'var(--red-500)' : 'var(--yellow-700)', display: 'flex', marginTop: 1 }}>
          <AlertTriangle size={15} />
        </span>
        <div>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 800, color: 'var(--text-h)' }}>
            {isDelete ? 'Delete this user?' : 'Generate a new access link?'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)' }}>
            {isDelete
              ? 'This permanently removes the user record and linked auth identity when one exists.'
              : 'This creates a fresh invitation link and updates the latest access metadata.'}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <Button variant="ghost" size="xs" iconLeft={<X size={12} />} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant={isDelete ? 'danger' : 'primary'}
          size="xs"
          loading={loading}
          disabled={disabled}
          onClick={onConfirm}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}

export function AdminUserDetailScreen({ userId }: { userId: string }) {
  const router = useRouter();
  const { session, appUser } = useAuth();
  const accessToken = session?.access_token ?? null;

  const [user, setUser] = React.useState<UserResponse | null>(null);
  const [loadingUser, setLoadingUser] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<NoticeState>(null);
  const [accountStatus, setAccountStatus] = React.useState<AccountStatus>('INVITED');
  const [managerRole, setManagerRole] = React.useState<ManagerRole | ''>('');
  const [studentForm, setStudentForm] = React.useState(createEmptyStudentForm);
  const [facultyForm, setFacultyForm] = React.useState(createEmptyFacultyForm);
  const [adminForm, setAdminForm] = React.useState(createEmptyAdminForm);
  const [managerForm, setManagerForm] = React.useState(createEmptyManagerForm);
  const [isEditing, setIsEditing] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);
  const [isSaving, startSaveTransition] = React.useTransition();
  const [isResending, startResendTransition] = React.useTransition();
  const [isCopying, startCopyTransition] = React.useTransition();
  const [isDeleting, startDeleteTransition] = React.useTransition();

  const loadUser = React.useCallback(async () => {
    if (!accessToken) {
      setLoadingUser(false);
      setLoadError('The admin session is unavailable. Please sign in again.');
      return;
    }

    setLoadingUser(true);
    setLoadError(null);

    try {
      const loadedUser = await getUser(accessToken, userId);
      setUser(loadedUser);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'We could not load this user.'));
    } finally {
      setLoadingUser(false);
    }
  }, [accessToken, userId]);

  React.useEffect(() => {
    void loadUser();
  }, [loadUser]);

  function syncFormState(nextUser: UserResponse) {
    setAccountStatus(nextUser.accountStatus);
    setManagerRole(nextUser.managerRole ?? '');
    setStudentForm(studentFormFromUser(nextUser));
    setFacultyForm(facultyFormFromUser(nextUser));
    setAdminForm(adminFormFromUser(nextUser));
    setManagerForm(managerFormFromUser(nextUser));
  }

  React.useEffect(() => {
    if (!user) return;
    syncFormState(user);
    setIsEditing(false);
    setConfirmAction(null);
  }, [user]);

  function handleCancelEdit() {
    if (user) syncFormState(user);
    setIsEditing(false);
  }

  async function handleCopyLink() {
    if (!user?.lastInviteReference) return;

    startCopyTransition(async () => {
      try {
        await navigator.clipboard.writeText(user.lastInviteReference ?? '');
        setNotice({ variant: 'success', title: 'Copied', message: 'Access link copied to clipboard.' });
      } catch {
        setNotice({ variant: 'error', title: 'Copy failed', message: 'Could not copy the access link.' });
      }
    });
  }

  async function handleResendInvite() {
    if (!accessToken || !user) {
      setNotice({ variant: 'error', title: 'Session unavailable', message: 'Please sign in again.' });
      return;
    }

    if (user.accountStatus === 'SUSPENDED') {
      setNotice({ variant: 'warning', title: 'Action blocked', message: 'Suspended users cannot receive new links.' });
      return;
    }

    startResendTransition(async () => {
      try {
        await resendInvite(accessToken, user.id);
        const refreshed = await getUser(accessToken, user.id);
        setUser(refreshed);
        setNotice({ variant: 'success', title: 'Access link generated', message: 'A fresh access link is ready.' });
      } catch (error) {
        setNotice({ variant: 'error', title: 'Link generation failed', message: getErrorMessage(error, 'We could not generate a new access link.') });
      } finally {
        setConfirmAction(null);
      }
    });
  }

  async function handleSave() {
    if (!accessToken || !user) {
      setNotice({ variant: 'error', title: 'Session unavailable', message: 'Please sign in again.' });
      return;
    }

    const isSelf = appUser?.id === user.id;

    startSaveTransition(async () => {
      try {
        const payload: UpdateUserRequest = {
          ...(isSelf ? {} : { accountStatus }),
        };

        if (user.userType === 'STUDENT') {
          payload.studentProfile = toStudentProfileInput(studentForm);
        }
        if (user.userType === 'FACULTY') {
          payload.facultyProfile = toFacultyProfileInput(facultyForm);
        }
        if (user.userType === 'ADMIN') {
          payload.adminProfile = toAdminProfileInput(adminForm);
        }
        if (user.userType === 'MANAGER') {
          payload.managerProfile = toManagerProfileInput(managerForm);
        }

        let updated = await updateUser(accessToken, user.id, payload);

        if (user.userType === 'MANAGER' && managerRole && managerRole !== user.managerRole) {
          updated = await replaceManagerRole(accessToken, user.id, { managerRole });
        }

        setUser(updated);
        setIsEditing(false);
        setNotice({ variant: 'success', title: 'Saved', message: 'User profile and access details were updated.' });
      } catch (error) {
        setNotice({ variant: 'error', title: 'Save failed', message: getErrorMessage(error, 'We could not save this user.') });
      }
    });
  }

  async function handleDelete() {
    if (!accessToken || !user) {
      setNotice({ variant: 'error', title: 'Session unavailable', message: 'Please sign in again.' });
      return;
    }

    if (appUser?.id === user.id) {
      setNotice({ variant: 'warning', title: 'Action blocked', message: 'You cannot delete your own account.' });
      return;
    }

    startDeleteTransition(async () => {
      try {
        await deleteUser(accessToken, user.id);
        setNotice({ variant: 'success', title: 'User deleted', message: `${user.email} was removed.` });
        router.push(detailListPath(user));
      } catch (error) {
        setNotice({ variant: 'error', title: 'Delete failed', message: getErrorMessage(error, 'Could not delete this user.') });
      } finally {
        setConfirmAction(null);
      }
    });
  }

  if (loadingUser) {
    return (
      <Card>
        <div style={{ display: 'grid', gap: 12 }}>
          <Skeleton variant="line" height={20} width="30%" />
          <Skeleton variant="rect" height={72} />
          <Skeleton variant="rect" height={360} />
        </div>
      </Card>
    );
  }

  if (loadError || !user) {
    return (
      <Alert variant="error" title="Unable to load user">
        {loadError ?? 'The requested user was not found.'}
      </Alert>
    );
  }

  const isSelf = appUser?.id === user.id;
  const suspended = user.accountStatus === 'SUSPENDED';
  const detailSections = buildDetailSections(user);
  const backLabel = detailListLabel(user);

  return (
    <div className="admin-detail-shell">
      <style>{`
        .admin-detail-shell {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .admin-detail-topbar {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .admin-detail-heading-block {
          display: grid;
          gap: 12px;
        }
        .admin-detail-heading-copy {
          display: grid;
          gap: 7px;
        }
        .admin-summary-card {
          display: grid;
          gap: 18px;
        }
        .admin-summary-main {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: center;
          flex-wrap: wrap;
        }
        .admin-profile-identity {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 260px;
        }
        .admin-profile-copy {
          display: grid;
          gap: 5px;
        }
        .admin-profile-copy p {
          margin: 0;
        }
        .admin-action-cluster {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .admin-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
        }
        .admin-meta-item {
          min-height: 70px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--surface-2);
          padding: 12px 14px;
          display: grid;
          align-content: center;
          gap: 6px;
        }
        .admin-meta-item span,
        .admin-detail-item span {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .admin-meta-item strong {
          font-size: 13px;
          font-weight: 800;
          color: var(--text-h);
          line-height: 1.35;
          overflow-wrap: anywhere;
        }
        .admin-detail-card-heading {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .admin-section-grid {
          display: grid;
          gap: 22px;
        }
        .admin-detail-section {
          display: grid;
          gap: 12px;
        }
        .admin-detail-section h2 {
          margin: 0;
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 850;
          color: var(--text-h);
        }
        .admin-detail-field-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 10px;
        }
        .admin-detail-item {
          min-height: 74px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: color-mix(in srgb, var(--surface-2) 82%, transparent);
          padding: 13px 14px;
          display: grid;
          align-content: center;
          gap: 7px;
        }
        .admin-detail-item strong {
          font-size: 13.5px;
          font-weight: 750;
          color: var(--text-body);
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
        .admin-editor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }
        .admin-edit-form {
          display: grid;
          gap: 18px;
        }
        .admin-confirm-message {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--surface-2);
          padding: 13px;
          box-shadow: var(--chip-shadow);
        }
        @media (max-width: 960px) {
          .admin-action-cluster {
            justify-content: flex-start;
          }
        }
      `}</style>

      <div className="admin-detail-topbar">
        <div className="admin-detail-heading-block">
          <Button
            variant="ghost-accent"
            size="sm"
            iconLeft={<ArrowLeft size={14} />}
            onClick={() => router.push(detailListPath(user))}
          >
            {backLabel}
          </Button>
          <div className="admin-detail-heading-copy">
            <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              User Details
            </p>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 900, letterSpacing: 0, lineHeight: 1.1, color: 'var(--text-h)' }}>
              {getUserDisplayName(user)}
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              Review profile information, account status, and access actions from one place.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip color={getUserTypeChipColor(user.userType)} dot>
            {getUserTypeLabel(user.userType)}
          </Chip>
          <Chip color={getAccountStatusChipColor(user.accountStatus)} dot>
            {getAccountStatusLabel(user.accountStatus)}
          </Chip>
          {user.managerRole && (
            <Chip color="blue">
              {getManagerRoleLabel(user.managerRole)}
            </Chip>
          )}
        </div>
      </div>

      {notice && (
        <Alert variant={notice.variant} title={notice.title}>
          {notice.message}
        </Alert>
      )}

      <Card>
        <div className="admin-summary-card">
          <div className="admin-summary-main">
            <div className="admin-profile-identity">
              <Avatar
                src={profileImageSrc(user) ?? undefined}
                initials={avatarInitials(user)}
                alt={getUserDisplayName(user)}
                size="xl"
                style={{
                  width: 94,
                  height: 94,
                  fontSize: 30,
                  border: '2px solid rgba(238,202,68,.32)',
                  boxShadow: '0 8px 18px rgba(0,0,0,.28), 0 2px 10px rgba(238,202,68,.28)',
                }}
              />
              <div className="admin-profile-copy">
                <p style={{ color: 'var(--text-h)', fontFamily: 'var(--font-display)', fontSize: 29, fontWeight: 800, lineHeight: 1.05 }}>
                  {getUserDisplayName(user)}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{user.email}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                  Profile and account overview
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
              <div className="admin-action-cluster">
                <Button
                  variant="subtle"
                  size="sm"
                  loading={isCopying}
                  disabled={!user.lastInviteReference}
                  iconLeft={<Copy size={14} />}
                  onClick={() => { void handleCopyLink(); }}
                >
                  Copy Link
                </Button>
                <Button
                  variant="subtle"
                  size="sm"
                  loading={isResending}
                  disabled={suspended}
                  iconLeft={<Mail size={14} />}
                  onClick={() => setConfirmAction('reinvite')}
                >
                  Reinvite
                </Button>
                <Button
                  variant="ghost-danger"
                  size="sm"
                  loading={isDeleting}
                  disabled={isSelf}
                  iconLeft={<Trash2 size={14} />}
                  onClick={() => setConfirmAction('delete')}
                >
                  Delete
                </Button>
              </div>
              {confirmAction && (
                <ConfirmMessage
                  action={confirmAction}
                  loading={confirmAction === 'delete' ? isDeleting : isResending}
                  disabled={confirmAction === 'delete' ? isSelf : suspended}
                  onCancel={() => setConfirmAction(null)}
                  onConfirm={() => {
                    if (confirmAction === 'delete') {
                      void handleDelete();
                      return;
                    }
                    void handleResendInvite();
                  }}
                />
              )}
            </div>
          </div>

          <Divider strong />

          <div className="admin-meta-grid">
            <MetaItem label="Role" value={getUserTypeLabel(user.userType)} />
            <MetaItem label="Account Status" value={getAccountStatusLabel(user.accountStatus)} />
            <MetaItem label="Last Login" value={formatDateTime(user.lastLoginAt)} />
            <MetaItem label="Invited" value={formatDateTime(user.invitedAt)} />
            <MetaItem label="Last Link Sent" value={formatDateTime(user.lastInviteSentAt)} />
            <MetaItem label="Invite Count" value={user.inviteSendCount} />
            <MetaItem label="Activated" value={formatDateTime(user.activatedAt)} />
            {user.managerRole && <MetaItem label="Manager Role" value={getManagerRoleLabel(user.managerRole)} />}
          </div>
        </div>
      </Card>

      <Card>
        <div className="admin-detail-card-heading">
          <div>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 850, color: 'var(--text-h)' }}>
              User Details
            </p>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Profile information is read-only until an admin starts a controlled edit.
            </p>
          </div>
          {isEditing ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button variant="glass" size="sm" loading={isSaving} iconLeft={<Save size={14} />} onClick={() => { void handleSave(); }}>
                Save
              </Button>
            </div>
          ) : (
            <Button variant="subtle" size="sm" iconLeft={<Edit3 size={14} />} onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="admin-edit-form">
            <div className="admin-editor-grid">
              <Input label="Email" value={user.email} disabled />
              <Select
                label="Account Status"
                value={accountStatus}
                onChange={(event) => setAccountStatus(event.target.value as AccountStatus)}
                options={accountStatusOptions}
                disabled={isSelf}
              />
            </div>

            <ProfileFields
              userType={user.userType}
              studentForm={studentForm}
              setStudentForm={setStudentForm}
              facultyForm={facultyForm}
              setFacultyForm={setFacultyForm}
              adminForm={adminForm}
              setAdminForm={setAdminForm}
              managerForm={managerForm}
              setManagerForm={setManagerForm}
            />

            {user.userType === 'MANAGER' && (
              <div style={{ display: 'grid', gap: 10 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Manager Role
                </p>
                <RoleRadioGroup value={managerRole} onChange={setManagerRole} />
              </div>
            )}
          </div>
        ) : (
          <div className="admin-section-grid">
            {detailSections.map((section) => (
              <section key={section.title} className="admin-detail-section">
                <h2>{section.title}</h2>
                <div className="admin-detail-field-grid">
                  {section.items.map((item) => (
                    <DetailItem key={`${section.title}-${item.label}`} label={item.label} value={item.value} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
