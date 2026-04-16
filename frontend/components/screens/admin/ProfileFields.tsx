'use client';

import React from 'react';

import { GlassPill, Input } from '@/components/ui';
import type { UserType } from '@/lib/api-types';

import type {
  AdminFormState,
  FacultyFormState,
  ManagerFormState,
} from '@/components/screens/admin/adminUserFormUtils';

export function ProfileFields({
  userType,
  facultyForm,
  setFacultyForm,
  adminForm,
  setAdminForm,
  managerForm,
  setManagerForm,
}: {
  userType: UserType;
  facultyForm: FacultyFormState;
  setFacultyForm: React.Dispatch<React.SetStateAction<FacultyFormState>>;
  adminForm: AdminFormState;
  setAdminForm: React.Dispatch<React.SetStateAction<AdminFormState>>;
  managerForm: ManagerFormState;
  setManagerForm: React.Dispatch<React.SetStateAction<ManagerFormState>>;
}) {
  if (userType === 'STUDENT') {
    return (
      <GlassPill style={{ padding: '16px 18px' }}>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-body)' }}>
          Student users are provisioned with shared identity data only. Their student-specific profile details are
          completed later during onboarding.
        </p>
      </GlassPill>
    );
  }

  if (userType === 'FACULTY') {
    return (
      <div className="admin-editor-grid">
        <Input label="First Name" value={facultyForm.firstName} onChange={(e) => setFacultyForm((c) => ({ ...c, firstName: e.target.value }))} required />
        <Input label="Last Name" value={facultyForm.lastName} onChange={(e) => setFacultyForm((c) => ({ ...c, lastName: e.target.value }))} required />
        <Input label="Preferred Name" value={facultyForm.preferredName} onChange={(e) => setFacultyForm((c) => ({ ...c, preferredName: e.target.value }))} />
        <Input label="Phone Number" value={facultyForm.phoneNumber} onChange={(e) => setFacultyForm((c) => ({ ...c, phoneNumber: e.target.value }))} />
        <Input label="Employee Number" value={facultyForm.employeeNumber} onChange={(e) => setFacultyForm((c) => ({ ...c, employeeNumber: e.target.value }))} required />
        <Input label="Department" value={facultyForm.department} onChange={(e) => setFacultyForm((c) => ({ ...c, department: e.target.value }))} required />
        <Input label="Designation" value={facultyForm.designation} onChange={(e) => setFacultyForm((c) => ({ ...c, designation: e.target.value }))} required />
      </div>
    );
  }

  if (userType === 'ADMIN') {
    return (
      <div className="admin-editor-grid">
        <Input label="Full Name" value={adminForm.fullName} onChange={(e) => setAdminForm((c) => ({ ...c, fullName: e.target.value }))} required />
        <Input label="Phone Number" value={adminForm.phoneNumber} onChange={(e) => setAdminForm((c) => ({ ...c, phoneNumber: e.target.value }))} />
        <Input label="Employee Number" value={adminForm.employeeNumber} onChange={(e) => setAdminForm((c) => ({ ...c, employeeNumber: e.target.value }))} required />
      </div>
    );
  }

  return (
    <div className="admin-editor-grid">
      <Input label="First Name" value={managerForm.firstName} onChange={(e) => setManagerForm((c) => ({ ...c, firstName: e.target.value }))} required />
      <Input label="Last Name" value={managerForm.lastName} onChange={(e) => setManagerForm((c) => ({ ...c, lastName: e.target.value }))} required />
      <Input label="Preferred Name" value={managerForm.preferredName} onChange={(e) => setManagerForm((c) => ({ ...c, preferredName: e.target.value }))} />
      <Input label="Phone Number" value={managerForm.phoneNumber} onChange={(e) => setManagerForm((c) => ({ ...c, phoneNumber: e.target.value }))} />
      <Input label="Employee Number" value={managerForm.employeeNumber} onChange={(e) => setManagerForm((c) => ({ ...c, employeeNumber: e.target.value }))} required />
    </div>
  );
}
