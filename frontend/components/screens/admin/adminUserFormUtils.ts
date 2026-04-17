import type {
  AcademicYear,
  AdminProfileInput,
  FacultyProfileInput,
  ManagerProfileInput,
  Semester,
  StudentFaculty,
  StudentProfileInput,
  StudentProgram,
  UserResponse,
} from '@/lib/api-types';

export interface SharedPersonFields {
  firstName: string;
  lastName: string;
  preferredName: string;
  phoneNumber: string;
  employeeNumber: string;
}

export interface FacultyFormState extends SharedPersonFields {
  department: string;
  designation: string;
}

export interface AdminFormState {
  fullName: string;
  phoneNumber: string;
  employeeNumber: string;
}

export interface StudentFormState {
  firstName: string;
  lastName: string;
  preferredName: string;
  phoneNumber: string;
  registrationNumber: string;
  facultyName: StudentFaculty | '';
  programName: StudentProgram | '';
  academicYear: AcademicYear | '';
  semester: Semester | '';
  profileImageUrl: string;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
}

export type ManagerFormState = SharedPersonFields;

export function createEmptyStudentForm(): StudentFormState {
  return {
    firstName: '',
    lastName: '',
    preferredName: '',
    phoneNumber: '',
    registrationNumber: '',
    facultyName: '',
    programName: '',
    academicYear: '',
    semester: '',
    profileImageUrl: '',
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: false,
  };
}

export function createEmptyFacultyForm(): FacultyFormState {
  return {
    firstName: '',
    lastName: '',
    preferredName: '',
    phoneNumber: '',
    employeeNumber: '',
    department: '',
    designation: '',
  };
}

export function createEmptyAdminForm(): AdminFormState {
  return {
    fullName: '',
    phoneNumber: '',
    employeeNumber: '',
  };
}

export function createEmptyManagerForm(): ManagerFormState {
  return {
    firstName: '',
    lastName: '',
    preferredName: '',
    phoneNumber: '',
    employeeNumber: '',
  };
}

export function facultyFormFromUser(user: UserResponse): FacultyFormState {
  return {
    firstName: user.facultyProfile?.firstName ?? '',
    lastName: user.facultyProfile?.lastName ?? '',
    preferredName: user.facultyProfile?.preferredName ?? '',
    phoneNumber: user.facultyProfile?.phoneNumber ?? '',
    employeeNumber: user.facultyProfile?.employeeNumber ?? '',
    department: user.facultyProfile?.department ?? '',
    designation: user.facultyProfile?.designation ?? '',
  };
}

export function studentFormFromUser(user: UserResponse): StudentFormState {
  return {
    firstName: user.studentProfile?.firstName ?? '',
    lastName: user.studentProfile?.lastName ?? '',
    preferredName: user.studentProfile?.preferredName ?? '',
    phoneNumber: user.studentProfile?.phoneNumber ?? '',
    registrationNumber: user.studentProfile?.registrationNumber ?? '',
    facultyName: user.studentProfile?.facultyName ?? '',
    programName: user.studentProfile?.programName ?? '',
    academicYear: user.studentProfile?.academicYear ?? '',
    semester: user.studentProfile?.semester ?? '',
    profileImageUrl: user.studentProfile?.profileImageUrl ?? '',
    emailNotificationsEnabled: user.studentProfile?.emailNotificationsEnabled ?? true,
    smsNotificationsEnabled: user.studentProfile?.smsNotificationsEnabled ?? false,
  };
}

export function adminFormFromUser(user: UserResponse): AdminFormState {
  return {
    fullName: user.adminProfile?.fullName ?? '',
    phoneNumber: user.adminProfile?.phoneNumber ?? '',
    employeeNumber: user.adminProfile?.employeeNumber ?? '',
  };
}

export function managerFormFromUser(user: UserResponse): ManagerFormState {
  return {
    firstName: user.managerProfile?.firstName ?? '',
    lastName: user.managerProfile?.lastName ?? '',
    preferredName: user.managerProfile?.preferredName ?? '',
    phoneNumber: user.managerProfile?.phoneNumber ?? '',
    employeeNumber: user.managerProfile?.employeeNumber ?? '',
  };
}

export function toFacultyProfileInput(form: FacultyFormState): FacultyProfileInput {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    preferredName: form.preferredName.trim() || undefined,
    phoneNumber: form.phoneNumber.trim() || undefined,
    employeeNumber: form.employeeNumber.trim(),
    department: form.department.trim(),
    designation: form.designation.trim(),
  };
}

export function toStudentProfileInput(form: StudentFormState): StudentProfileInput {
  if (!form.facultyName || !form.programName || !form.academicYear || !form.semester) {
    throw new Error('Student academic fields are required.');
  }

  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    preferredName: form.preferredName.trim() || undefined,
    phoneNumber: form.phoneNumber.trim(),
    registrationNumber: form.registrationNumber.trim(),
    facultyName: form.facultyName,
    programName: form.programName,
    academicYear: form.academicYear,
    semester: form.semester,
    profileImageUrl: form.profileImageUrl.trim() || undefined,
    emailNotificationsEnabled: form.emailNotificationsEnabled,
    smsNotificationsEnabled: form.smsNotificationsEnabled,
  };
}

export function toAdminProfileInput(form: AdminFormState): AdminProfileInput {
  return {
    fullName: form.fullName.trim(),
    phoneNumber: form.phoneNumber.trim() || undefined,
    employeeNumber: form.employeeNumber.trim(),
  };
}

export function toManagerProfileInput(form: ManagerFormState): ManagerProfileInput {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    preferredName: form.preferredName.trim() || undefined,
    phoneNumber: form.phoneNumber.trim() || undefined,
    employeeNumber: form.employeeNumber.trim(),
  };
}
