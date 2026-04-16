import type {
  AdminProfileInput,
  FacultyProfileInput,
  ManagerProfileInput,
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

export type ManagerFormState = SharedPersonFields;

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
