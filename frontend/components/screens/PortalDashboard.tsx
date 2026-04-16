'use client';

import React from 'react';
import { ArrowRight, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button, Card, Chip, Table, TableBody, TableCell, TableRow } from '@/components/ui';
import type { UserResponse } from '@/lib/api-types';
import { getStudentFacultyLabel, getStudentProgramLabel } from '@/lib/student-catalog';
import {
  getAccountStatusChipColor,
  getAccountStatusLabel,
  getManagerRoleLabel,
  getUserDisplayName,
  getUserTypeChipColor,
  getUserTypeLabel,
} from '@/lib/user-display';

function getProfileSummary(user: UserResponse) {
  if (user.studentProfile) {
    return getStudentProgramLabel(user.studentProfile.programName)
      || getStudentFacultyLabel(user.studentProfile.facultyName)
      || 'Student profile pending';
  }

  if (user.facultyProfile) {
    return user.facultyProfile.designation ?? user.facultyProfile.department ?? 'Faculty profile';
  }

  if (user.adminProfile) {
    return user.adminProfile.fullName ?? 'Admin profile';
  }

  if (user.managerProfile) {
    return user.managerRole ? getManagerRoleLabel(user.managerRole) : 'Manager profile';
  }

  return 'Provisioned account';
}

export function PortalDashboard({ user }: { user?: UserResponse }) {
  const router = useRouter();
  const { appUser } = useAuth();
  const resolvedUser = user ?? appUser ?? null;

  if (!resolvedUser) {
    return null;
  }

  const displayName = getUserDisplayName(resolvedUser);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--text-h)',
              margin: 0,
            }}
          >
            Welcome, {displayName}
          </h1>
          <Chip color={getUserTypeChipColor(resolvedUser.userType)} dot>
            {getUserTypeLabel(resolvedUser.userType)}
          </Chip>
          {resolvedUser.managerRole && (
            <Chip color="blue">
              {getManagerRoleLabel(resolvedUser.managerRole)}
            </Chip>
          )}
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
          {getProfileSummary(resolvedUser)}
        </p>
      </div>

      {/* Info table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Table>
          <TableBody>
            <TableRow hoverable={false}>
              <TableCell label>Email</TableCell>
              <TableCell>{resolvedUser.email}</TableCell>
            </TableRow>

            <TableRow hoverable={false}>
              <TableCell label>Status</TableCell>
              <TableCell>
                <Chip color={getAccountStatusChipColor(resolvedUser.accountStatus)} dot>
                  {getAccountStatusLabel(resolvedUser.accountStatus)}
                </Chip>
              </TableCell>
            </TableRow>

            <TableRow hoverable={false}>
              <TableCell label>Role</TableCell>
              <TableCell>
                <Chip color={getUserTypeChipColor(resolvedUser.userType)} dot>
                  {getUserTypeLabel(resolvedUser.userType)}
                </Chip>
              </TableCell>
            </TableRow>

            <TableRow hoverable={false}>
              <TableCell label>Profile</TableCell>
              <TableCell>{getProfileSummary(resolvedUser)}</TableCell>
            </TableRow>

            <TableRow hoverable={false}>
              <TableCell label>Sign-in</TableCell>
              <TableCell>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Chip color="glass">
                    <KeyRound size={12} style={{ display: 'inline-block' }} />
                    Password
                  </Chip>
                  <Chip color="blue">Google</Chip>
                </div>
              </TableCell>
            </TableRow>

            <TableRow hoverable={false}>
              <TableCell label>Security</TableCell>
              <TableCell>
                <Button
                  variant="glass"
                  size="sm"
                  iconRight={<ArrowRight size={14} />}
                  onClick={() => router.push('/account/security')}
                >
                  Account Security
                </Button>
              </TableCell>
            </TableRow>

            {resolvedUser.userType === 'ADMIN' && (
              <TableRow hoverable={false}>
                <TableCell label>Admin</TableCell>
                <TableCell>
                  <Button
                    variant="glass"
                    size="sm"
                    iconRight={<ArrowRight size={14} />}
                    onClick={() => router.push('/admin/users')}
                  >
                    User Management
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
