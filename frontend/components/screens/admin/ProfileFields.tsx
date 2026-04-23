'use client';

import React from 'react';

import { GlassPill, Input, Select, Toggle } from '@/components/ui';
import type { StudentFaculty, StudentProgram, UserType } from '@/lib/api-types';
import {
  academicYearOptions,
  facultyOptions,
  programBelongsToFaculty,
  programOptionsByFaculty,
  semesterOptions,
} from '@/lib/student-catalog';

import type {
  AdminFormState,
  FacultyFormState,
  ManagerFormState,
  StudentFormState,
} from '@/components/screens/admin/adminUserFormUtils';

export function ProfileFields({
  userType,
  studentForm,
  setStudentForm,
  facultyForm,
  setFacultyForm,
  adminForm,
  setAdminForm,
  managerForm,
  setManagerForm,
}: {
  userType: UserType;
  studentForm?: StudentFormState;
  setStudentForm?: React.Dispatch<React.SetStateAction<StudentFormState>>;
  facultyForm: FacultyFormState;
  setFacultyForm: React.Dispatch<React.SetStateAction<FacultyFormState>>;
  adminForm: AdminFormState;
  setAdminForm: React.Dispatch<React.SetStateAction<AdminFormState>>;
  managerForm: ManagerFormState;
  setManagerForm: React.Dispatch<React.SetStateAction<ManagerFormState>>;
}) {
  if (userType === 'STUDENT') {
    if (studentForm && setStudentForm) {
      const setStudentFormState = setStudentForm;
      const programOptions = studentForm.facultyName ? programOptionsByFaculty[studentForm.facultyName] : [];

      function handleFacultyChange(facultyName: StudentFaculty | '') {
        setStudentFormState((current) => ({
          ...current,
          facultyName,
          programName:
            facultyName && current.programName && programBelongsToFaculty(current.programName, facultyName)
              ? current.programName
              : '',
        }));
      }

      return (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="admin-editor-grid">
            <Input label="First Name" value={studentForm.firstName} onChange={(e) => setStudentForm((c) => ({ ...c, firstName: e.target.value }))} required />
            <Input label="Last Name" value={studentForm.lastName} onChange={(e) => setStudentForm((c) => ({ ...c, lastName: e.target.value }))} required />
            <Input label="Preferred Name" value={studentForm.preferredName} onChange={(e) => setStudentForm((c) => ({ ...c, preferredName: e.target.value }))} />
            <Input label="Phone Number" value={studentForm.phoneNumber} onChange={(e) => setStudentForm((c) => ({ ...c, phoneNumber: e.target.value }))} required />
            <Select
              label="Faculty / School"
              value={studentForm.facultyName}
              onChange={(e) => handleFacultyChange(e.target.value as StudentFaculty | '')}
              options={facultyOptions}
              placeholder="Choose faculty"
              required
            />
            <Select
              label="Program"
              value={studentForm.programName}
              onChange={(e) => setStudentForm((c) => ({ ...c, programName: e.target.value as StudentProgram | '' }))}
              options={programOptions}
              placeholder="Choose program"
              disabled={!studentForm.facultyName}
              required
            />
            <Select
              label="Academic Year"
              value={studentForm.academicYear}
              onChange={(e) => setStudentForm((c) => ({ ...c, academicYear: e.target.value as StudentFormState['academicYear'] }))}
              options={academicYearOptions}
              placeholder="Choose year"
              required
            />
            <Select
              label="Semester"
              value={studentForm.semester}
              onChange={(e) => setStudentForm((c) => ({ ...c, semester: e.target.value as StudentFormState['semester'] }))}
              options={semesterOptions}
              placeholder="Choose semester"
              required
            />
            <Input label="Profile Image URL" value={studentForm.profileImageUrl} onChange={(e) => setStudentForm((c) => ({ ...c, profileImageUrl: e.target.value }))} />
          </div>
          <GlassPill style={{ padding: '14px 16px', display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <Toggle
              label="Email notifications"
              checked={studentForm.emailNotificationsEnabled}
              onChange={(checked) => setStudentForm((c) => ({ ...c, emailNotificationsEnabled: checked }))}
            />
            <Toggle
              label="SMS notifications"
              checked={studentForm.smsNotificationsEnabled}
              onChange={(checked) => setStudentForm((c) => ({ ...c, smsNotificationsEnabled: checked }))}
            />
          </GlassPill>
        </div>
      );
    }

    return null;
  }

  if (userType === 'FACULTY') {
    return (
      <div className="admin-editor-grid">
        <Input label="First Name" value={facultyForm.firstName} onChange={(e) => setFacultyForm((c) => ({ ...c, firstName: e.target.value }))} required />
        <Input label="Last Name" value={facultyForm.lastName} onChange={(e) => setFacultyForm((c) => ({ ...c, lastName: e.target.value }))} required />
        <Input label="Preferred Name" value={facultyForm.preferredName} onChange={(e) => setFacultyForm((c) => ({ ...c, preferredName: e.target.value }))} />
        <Input label="Phone Number" value={facultyForm.phoneNumber} onChange={(e) => setFacultyForm((c) => ({ ...c, phoneNumber: e.target.value }))} />
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
      </div>
    );
  }

  return (
    <div className="admin-editor-grid">
      <Input label="First Name" value={managerForm.firstName} onChange={(e) => setManagerForm((c) => ({ ...c, firstName: e.target.value }))} required />
      <Input label="Last Name" value={managerForm.lastName} onChange={(e) => setManagerForm((c) => ({ ...c, lastName: e.target.value }))} required />
      <Input label="Preferred Name" value={managerForm.preferredName} onChange={(e) => setManagerForm((c) => ({ ...c, preferredName: e.target.value }))} />
      <Input label="Phone Number" value={managerForm.phoneNumber} onChange={(e) => setManagerForm((c) => ({ ...c, phoneNumber: e.target.value }))} />
    </div>
  );
}
