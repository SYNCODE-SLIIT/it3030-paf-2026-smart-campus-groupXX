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
  department: string;
}

export interface FacultyFormState extends SharedPersonFields {
  designation: string;
  officeLocation: string;
  officePhone: string;
}

export interface AdminFormState extends SharedPersonFields {
  jobTitle: string;
  officePhone: string;
}

export interface ManagerFormState extends SharedPersonFields {
  jobTitle: string;
  officeLocation: string;
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
    officeLocation: '',
    officePhone: '',
  };
}

export function createEmptyAdminForm(): AdminFormState {
  return {
    firstName: '',
    lastName: '',
    preferredName: '',
    phoneNumber: '',
    employeeNumber: '',
    department: '',
    jobTitle: '',
    officePhone: '',
  };
}

export function createEmptyManagerForm(): ManagerFormState {
  return {
    firstName: '',
    lastName: '',
    preferredName: '',
    phoneNumber: '',
    employeeNumber: '',
    department: '',
    jobTitle: '',
    officeLocation: '',
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
    officeLocation: user.facultyProfile?.officeLocation ?? '',
    officePhone: user.facultyProfile?.officePhone ?? '',
  };
}

export function adminFormFromUser(user: UserResponse): AdminFormState {
  return {
    firstName: user.adminProfile?.firstName ?? '',
    lastName: user.adminProfile?.lastName ?? '',
    preferredName: user.adminProfile?.preferredName ?? '',
    phoneNumber: user.adminProfile?.phoneNumber ?? '',
    employeeNumber: user.adminProfile?.employeeNumber ?? '',
    department: user.adminProfile?.department ?? '',
    jobTitle: user.adminProfile?.jobTitle ?? '',
    officePhone: user.adminProfile?.officePhone ?? '',
  };
}

export function managerFormFromUser(user: UserResponse): ManagerFormState {
  return {
    firstName: user.managerProfile?.firstName ?? '',
    lastName: user.managerProfile?.lastName ?? '',
    preferredName: user.managerProfile?.preferredName ?? '',
    phoneNumber: user.managerProfile?.phoneNumber ?? '',
    employeeNumber: user.managerProfile?.employeeNumber ?? '',
    department: user.managerProfile?.department ?? '',
    jobTitle: user.managerProfile?.jobTitle ?? '',
    officeLocation: user.managerProfile?.officeLocation ?? '',
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
    officeLocation: form.officeLocation.trim() || undefined,
    officePhone: form.officePhone.trim() || undefined,
  };
}

export function toAdminProfileInput(form: AdminFormState): AdminProfileInput {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    preferredName: form.preferredName.trim() || undefined,
    phoneNumber: form.phoneNumber.trim() || undefined,
    employeeNumber: form.employeeNumber.trim(),
    department: form.department.trim(),
    jobTitle: form.jobTitle.trim(),
    officePhone: form.officePhone.trim() || undefined,
  };
}

export function toManagerProfileInput(form: ManagerFormState): ManagerProfileInput {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    preferredName: form.preferredName.trim() || undefined,
    phoneNumber: form.phoneNumber.trim() || undefined,
    employeeNumber: form.employeeNumber.trim(),
    department: form.department.trim(),
    jobTitle: form.jobTitle.trim(),
    officeLocation: form.officeLocation.trim() || undefined,
  };
}
