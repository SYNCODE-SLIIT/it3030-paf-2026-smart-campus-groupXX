'use client';

import React from 'react';
import { Filter, Trash2 } from 'lucide-react';

import { UserIdentityCell } from '@/components/screens/admin/UserIdentityCell';
import {
  Alert,
  Button,
  Chip,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import type { AccountStatus, UserResponse, UserType } from '@/lib/api-types';
import {
  getAccountStatusChipColor,
  getAccountStatusLabel,
  getUserDisplayName,
  getUserInitials,
  getUserTypeChipColor,
  getUserTypeLabel,
} from '@/lib/user-display';

export type RoleTab = 'ALL' | UserType;

export const roleTabs: Array<{ value: RoleTab; label: string }> = [
  { value: 'ALL',     label: 'All Users' },
  { value: 'ADMIN',   label: 'Admin'     },
  { value: 'MANAGER', label: 'Manager'   },
  { value: 'FACULTY', label: 'Faculty'   },
  { value: 'STUDENT', label: 'Student'   },
];

const PAGE_SIZE = 10;

interface UserTableCardProps {
  users: UserResponse[];
  loading: boolean;
  error: string | null;
  roleTab: RoleTab;
  onRoleTabChange: (tab: RoleTab) => void;
  statusFilter: AccountStatus | '';
  onStatusFilterChange: (val: AccountStatus | '') => void;
  onDeleteUser: (user: UserResponse) => void;
  deletingUserId: string | null;
  currentUserId?: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function RoleTabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  const highlighted = active || hovered;

  return (
    <button
      role="tab"
      aria-selected={active}
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 14px',
        border: `1px solid ${highlighted ? 'rgba(238,202,68,.4)' : 'transparent'}`,
        borderRadius: 'var(--radius-xl)',
        background: highlighted ? 'rgba(238,202,68,.12)' : 'transparent',
        color: highlighted ? 'var(--yellow-700)' : 'var(--text-muted)',
        fontFamily: 'var(--font-display)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.04em',
        cursor: 'pointer',
        transition: 'background .15s, color .15s, border-color .15s',
      }}
    >
      {label}
    </button>
  );
}

function FilterToggleButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);
  const highlighted = open || hovered;

  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        border: `1px solid ${highlighted ? 'rgba(238,202,68,.4)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        background: highlighted ? 'rgba(238,202,68,.06)' : 'transparent',
        color: highlighted ? 'var(--yellow-700)' : 'var(--text-muted)',
        fontFamily: 'var(--font-display)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.04em',
        cursor: 'pointer',
        transition: 'background .15s, color .15s, border-color .15s',
        flexShrink: 0,
      }}
    >
      <Filter size={13} strokeWidth={2.2} />
      Filters
    </button>
  );
}

function PageButton({
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  const highlighted = (active || hovered) && !disabled;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 32,
        minWidth: 32,
        padding: '0 10px',
        border: `1px solid ${highlighted ? 'rgba(238,202,68,.4)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        background: highlighted ? 'rgba(238,202,68,.14)' : 'transparent',
        color: highlighted ? 'var(--yellow-700)' : 'var(--text-body)',
        fontFamily: 'var(--font-display)',
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background .13s, color .13s, border-color .13s, opacity .13s',
      }}
    >
      {label}
    </button>
  );
}

export function UserTableCard({
  users,
  loading,
  error,
  roleTab,
  onRoleTabChange,
  statusFilter,
  onStatusFilterChange,
  onDeleteUser,
  deletingUserId,
  currentUserId,
}: UserTableCardProps) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [roleTab, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = users.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pageNums = React.useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 3) return [1, 2, 3, 4, 5];
    if (safePage >= totalPages - 2)
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages].filter((p) => p > 0);
    return [safePage - 2, safePage - 1, safePage, safePage + 1, safePage + 2];
  }, [safePage, totalPages]);

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--surface)',
        boxShadow: 'var(--card-shadow)',
        overflow: 'hidden',
      }}
    >
      {/* Header controls */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Tabs + filter toggle row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div role="tablist" aria-label="Role filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {roleTabs.map((tab) => (
              <RoleTabButton
                key={tab.value}
                label={tab.label}
                active={roleTab === tab.value}
                onClick={() => onRoleTabChange(tab.value)}
              />
            ))}
          </div>
          <FilterToggleButton open={filtersOpen} onClick={() => setFiltersOpen((v) => !v)} />
        </div>

        {/* Expandable filters panel */}
        {filtersOpen && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
              padding: 16,
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-2)',
            }}
          >
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as AccountStatus | '')}
              options={[
                { value: '',           label: 'All statuses' },
                { value: 'ACTIVE',     label: 'Active'       },
                { value: 'INVITED',    label: 'Invited'      },
                { value: 'SUSPENDED',  label: 'Suspended'    },
              ]}
            />
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onStatusFilterChange('');
                  setFiltersOpen(false);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table body */}
      <div style={{ overflowX: 'auto' }}>
        {error ? (
          <div style={{ padding: 18 }}>
            <Alert variant="error" title="Directory unavailable">
              {error}
            </Alert>
          </div>
        ) : loading ? (
          <div style={{ display: 'grid', gap: 10, padding: 16 }}>
            <Skeleton variant="rect" height={54} />
            <Skeleton variant="rect" height={54} />
            <Skeleton variant="rect" height={54} />
            <Skeleton variant="rect" height={54} />
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-h)',
                margin: 0,
              }}
            >
              No users found
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 0' }}>
              Try adjusting the filters or search.
            </p>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow hoverable={false}>
                <TableHeader style={{ background: 'var(--surface-2)', padding: '12px 20px' }}>
                  Name / Identity
                </TableHeader>
                <TableHeader style={{ background: 'var(--surface-2)', padding: '12px 20px' }}>
                  Role
                </TableHeader>
                <TableHeader style={{ background: 'var(--surface-2)', padding: '12px 20px' }}>
                  Last Login
                </TableHeader>
                <TableHeader style={{ background: 'var(--surface-2)', padding: '12px 20px' }}>
                  Invited
                </TableHeader>
                <TableHeader style={{ background: 'var(--surface-2)', padding: '12px 20px' }}>
                  Status
                </TableHeader>
                <TableHeader
                  style={{
                    background: 'var(--surface-2)',
                    padding: '12px 20px',
                    textAlign: 'right',
                  }}
                >
                  Actions
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell style={{ padding: '12px 20px' }}>
                    <UserIdentityCell
                      name={getUserDisplayName(user)}
                      email={user.email}
                      initials={getUserInitials(user)}
                    />
                  </TableCell>
                  <TableCell style={{ padding: '12px 20px' }}>
                    <Chip color={getUserTypeChipColor(user.userType)} dot>
                      {getUserTypeLabel(user.userType)}
                    </Chip>
                  </TableCell>
                  <TableCell style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {formatDate(user.lastLoginAt)}
                  </TableCell>
                  <TableCell style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {formatDate(user.invitedAt)}
                  </TableCell>
                  <TableCell style={{ padding: '12px 20px' }}>
                    <Chip color={getAccountStatusChipColor(user.accountStatus)} dot>
                      {getAccountStatusLabel(user.accountStatus)}
                    </Chip>
                  </TableCell>
                  <TableCell style={{ padding: '12px 20px', textAlign: 'right' }}>
                    <Button
                      variant="ghost-danger"
                      size="xs"
                      loading={deletingUserId === user.id}
                      disabled={currentUserId === user.id}
                      iconLeft={<Trash2 size={12} />}
                      onClick={() => onDeleteUser(user)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && users.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, users.length)} of{' '}
            {users.length} users
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <PageButton
              label="Prev"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
            {pageNums.map((n) => (
              <PageButton
                key={n}
                label={String(n)}
                active={n === safePage}
                onClick={() => setPage(n)}
              />
            ))}
            <PageButton
              label="Next"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
