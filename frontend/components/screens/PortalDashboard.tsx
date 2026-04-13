'use client';

import React from 'react';
import { ArrowRight, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button, Card, Chip, GlassPill } from '@/components/ui';
import type { UserResponse } from '@/lib/api-types';
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
    return user.studentProfile.programName ?? user.studentProfile.facultyName ?? 'Student profile pending';
  }

  if (user.facultyProfile) {
    return user.facultyProfile.designation ?? user.facultyProfile.department ?? 'Faculty profile';
  }

  if (user.adminProfile) {
    return user.adminProfile.jobTitle ?? user.adminProfile.department ?? 'Admin profile';
  }

  if (user.managerProfile) {
    return user.managerProfile.jobTitle ?? user.managerProfile.department ?? 'Manager profile';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <GlassPill
        style={{
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Chip color={getUserTypeChipColor(resolvedUser.userType)} dot>
            {getUserTypeLabel(resolvedUser.userType)}
          </Chip>
          <Chip color={getAccountStatusChipColor(resolvedUser.accountStatus)} dot>
            {getAccountStatusLabel(resolvedUser.accountStatus)}
          </Chip>
          {resolvedUser.managerRoles.map((role) => (
            <Chip key={role} color="blue">
              {getManagerRoleLabel(role)}
            </Chip>
          ))}
        </div>

        <div>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--text-h)',
            }}
          >
            {displayName}
          </p>
          <p style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body)' }}>
            Your account is active.
          </p>
        </div>
      </GlassPill>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 18,
        }}
      >
        <Card>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-h)',
              marginBottom: 8,
            }}
          >
            Account Summary
          </p>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>
            <strong style={{ color: 'var(--text-h)' }}>Email:</strong> {resolvedUser.email}
          </p>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>
            <strong style={{ color: 'var(--text-h)' }}>Role:</strong> {getUserTypeLabel(resolvedUser.userType)}
          </p>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>
            <strong style={{ color: 'var(--text-h)' }}>Profile:</strong> {getProfileSummary(resolvedUser)}
          </p>
        </Card>

        <Card
          footer={
            <Button
              variant="glass"
              size="sm"
              iconRight={<ArrowRight size={14} />}
              onClick={() => router.push('/account/security')}
            >
              Open Security
            </Button>
          }
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-h)',
              marginBottom: 8,
            }}
          >
            Sign-in Options
          </p>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>
            Use Google any time. If you want email and password sign-in too, set your password in Account Security.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <Chip color="glass">
              <KeyRound size={12} style={{ display: 'inline-block' }} />
              Password
            </Chip>
            <Chip color="blue">Google</Chip>
          </div>
        </Card>

        <Card
          footer={
            resolvedUser.userType === 'ADMIN' ? (
              <Button
                variant="glass"
                size="sm"
                iconRight={<ArrowRight size={14} />}
                onClick={() => router.push('/admin/users')}
              >
                Open User Management
              </Button>
            ) : undefined
          }
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-h)',
              marginBottom: 8,
            }}
          >
            Access Scope
          </p>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)' }}>
            {resolvedUser.userType === 'ADMIN'
              ? 'Manage invited users, generate access links, and maintain role assignments.'
              : resolvedUser.userType === 'MANAGER'
              ? 'Your access scope depends on the manager roles assigned to your account.'
              : resolvedUser.userType === 'FACULTY'
              ? 'Faculty access is active and onboarding is not required for this role.'
              : 'Student onboarding is complete and your account is ready.'}
          </p>
        </Card>
      </div>
    </div>
  );
}
