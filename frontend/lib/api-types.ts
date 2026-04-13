export type UserType = 'STUDENT' | 'FACULTY' | 'ADMIN' | 'MANAGER';

export type AccountStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';

export type AuthDeliveryMethod = 'INVITE_EMAIL' | 'LOGIN_LINK_EMAIL';

export type ManagerRole = 'CATALOG_MANAGER' | 'BOOKING_MANAGER' | 'TICKET_MANAGER';

export type NextStep = 'ONBOARDING' | 'DASHBOARD';

export interface MessageResponse {
  message: string;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

export interface StudentProfileResponse {
  onboardingCompleted: boolean;
  firstName: string | null;
  lastName: string | null;
  preferredName: string | null;
  phoneNumber: string | null;
  registrationNumber: string | null;
  facultyName: string | null;
  programName: string | null;
  academicYear: number | null;
  semester: string | null;
  profileImageUrl: string | null;
  emailNotificationsEnabled: boolean | null;
  smsNotificationsEnabled: boolean | null;
}

export interface FacultyProfileResponse {
  firstName: string | null;
  lastName: string | null;
  preferredName: string | null;
  phoneNumber: string | null;
  employeeNumber: string | null;
  department: string | null;
  designation: string | null;
  officeLocation: string | null;
  officePhone: string | null;
}

export interface AdminProfileResponse {
  firstName: string | null;
  lastName: string | null;
  preferredName: string | null;
  phoneNumber: string | null;
  employeeNumber: string | null;
  department: string | null;
  jobTitle: string | null;
  officePhone: string | null;
}

export interface ManagerProfileResponse {
  firstName: string | null;
  lastName: string | null;
  preferredName: string | null;
  phoneNumber: string | null;
  employeeNumber: string | null;
  department: string | null;
  jobTitle: string | null;
  officeLocation: string | null;
}

export interface UserResponse {
  id: string;
  authUserId: string | null;
  email: string;
  userType: UserType;
  accountStatus: AccountStatus;
  lastLoginAt: string | null;
  invitedAt: string;
  activatedAt: string | null;
  lastInviteSentAt: string | null;
  inviteSendCount: number;
  lastInviteMethod: AuthDeliveryMethod | null;
  lastInviteReference: string | null;
  lastInviteRedirectUri: string | null;
  managerRoles: ManagerRole[];
  studentProfile: StudentProfileResponse | null;
  facultyProfile: FacultyProfileResponse | null;
  adminProfile: AdminProfileResponse | null;
  managerProfile: ManagerProfileResponse | null;
}

export interface SessionSyncResponse {
  user: UserResponse;
  nextStep: NextStep;
}

export interface StudentOnboardingStateResponse {
  onboardingCompleted: boolean;
  profile: StudentProfileResponse | null;
}

export interface FacultyProfileInput {
  firstName: string;
  lastName: string;
  preferredName?: string;
  phoneNumber?: string;
  employeeNumber: string;
  department: string;
  designation: string;
  officeLocation?: string;
  officePhone?: string;
}

export interface AdminProfileInput {
  firstName: string;
  lastName: string;
  preferredName?: string;
  phoneNumber?: string;
  employeeNumber: string;
  department: string;
  jobTitle: string;
  officePhone?: string;
}

export interface ManagerProfileInput {
  firstName: string;
  lastName: string;
  preferredName?: string;
  phoneNumber?: string;
  employeeNumber: string;
  department: string;
  jobTitle: string;
  officeLocation?: string;
}

export interface CreateUserRequest {
  email: string;
  userType: UserType;
  sendInvite: boolean;
  studentProfile?: Record<string, never>;
  facultyProfile?: FacultyProfileInput | null;
  adminProfile?: AdminProfileInput | null;
  managerProfile?: ManagerProfileInput | null;
  managerRoles?: ManagerRole[] | null;
}

export interface UpdateUserRequest {
  accountStatus?: AccountStatus;
  facultyProfile?: FacultyProfileInput | null;
  adminProfile?: AdminProfileInput | null;
  managerProfile?: ManagerProfileInput | null;
}

export interface ManagerRolesUpdateRequest {
  managerRoles: ManagerRole[];
}

export interface StudentOnboardingRequest {
  firstName: string;
  lastName: string;
  preferredName?: string;
  phoneNumber: string;
  registrationNumber: string;
  facultyName: string;
  programName: string;
  academicYear: number;
  semester?: string;
  profileImageUrl?: string;
  emailNotificationsEnabled?: boolean;
  smsNotificationsEnabled?: boolean;
}
