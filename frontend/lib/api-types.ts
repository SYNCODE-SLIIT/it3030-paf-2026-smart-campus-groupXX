export type UserType = 'STUDENT' | 'FACULTY' | 'ADMIN' | 'MANAGER';

export type AccountStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';

export type AuthDeliveryMethod = 'INVITE_EMAIL' | 'LOGIN_LINK_EMAIL';

export type ManagerRole = 'CATALOG_MANAGER' | 'BOOKING_MANAGER' | 'TICKET_MANAGER';

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type ResourceCategory =
  | 'SPACES'
  | 'TECHNICAL_EQUIPMENT'
  | 'MAINTENANCE_AND_CLEANING'
  | 'SPORTS'
  | 'EVENT_AND_DECORATION'
  | 'GENERAL_UTILITY'
  | 'TRANSPORT_AND_LOGISTICS';

export type ResourceStatus = 'ACTIVE' | 'OUT_OF_SERVICE' | 'MAINTENANCE' | 'INACTIVE';

export type StudentFaculty =
  | 'FACULTY_OF_COMPUTING'
  | 'FACULTY_OF_ENGINEERING'
  | 'SLIIT_BUSINESS_SCHOOL'
  | 'FACULTY_OF_HUMANITIES_AND_SCIENCES'
  | 'SCHOOL_OF_ARCHITECTURE'
  | 'WILLIAM_ANGLISS_AT_SLIIT'
  | 'FACULTY_OF_GRADUATE_STUDIES_AND_RESEARCH';

export type StudentProgram =
  | 'BSC_HONS_INFORMATION_TECHNOLOGY'
  | 'BSC_HONS_COMPUTER_SCIENCE'
  | 'BSC_HONS_COMPUTER_SYSTEMS_ENGINEERING'
  | 'BSC_HONS_IT_ARTIFICIAL_INTELLIGENCE'
  | 'BSC_HONS_IT_SOFTWARE_ENGINEERING'
  | 'BSC_HONS_IT_COMPUTER_SYSTEMS_NETWORK_ENGINEERING'
  | 'BSC_HONS_IT_INFORMATION_SYSTEMS_ENGINEERING'
  | 'BSC_HONS_IT_CYBER_SECURITY'
  | 'BSC_HONS_IT_INTERACTIVE_MEDIA'
  | 'BSC_HONS_IT_DATA_SCIENCE'
  | 'BSC_ENG_HONS_CIVIL_ENGINEERING'
  | 'BSC_ENG_HONS_ELECTRICAL_ELECTRONIC_ENGINEERING'
  | 'BSC_ENG_HONS_MECHANICAL_ENGINEERING'
  | 'BSC_ENG_HONS_MECHANICAL_ENGINEERING_MECHATRONICS'
  | 'BSC_ENG_HONS_MATERIALS_ENGINEERING'
  | 'BBA_HONS_ACCOUNTING_FINANCE'
  | 'BBA_HONS_BUSINESS_ANALYTICS'
  | 'BBA_HONS_HUMAN_CAPITAL_MANAGEMENT'
  | 'BBA_HONS_MARKETING_MANAGEMENT'
  | 'BBA_HONS_LOGISTICS_SUPPLY_CHAIN_MANAGEMENT'
  | 'BBA_HONS_BUSINESS_MANAGEMENT'
  | 'BBA_HONS_MANAGEMENT_INFORMATION_SYSTEMS'
  | 'BBA_HONS_QUALITY_MANAGEMENT'
  | 'BSC_HONS_FINANCIAL_MATHS_APPLIED_STATISTICS'
  | 'BSC_HONS_BIOTECHNOLOGY'
  | 'BSC_HONS_PSYCHOLOGY'
  | 'BSC_HONS_NURSING'
  | 'BA_HONS_ENGLISH_STUDIES'
  | 'BED_HONS_SCIENCES_ENGLISH_SOCIAL_SCIENCES_IT'
  | 'BSC_HONS_ARCHITECTURE'
  | 'BA_HONS_INTERIOR_DESIGN'
  | 'MSC_ARCHITECTURE'
  | 'ADVANCED_DIPLOMA_HOSPITALITY_MANAGEMENT'
  | 'ADVANCED_DIPLOMA_TRAVEL_TOURISM_MANAGEMENT'
  | 'DIPLOMA_EVENT_MANAGEMENT'
  | 'CERTIFICATE_IV_PATISSERIE'
  | 'COMMERCIAL_COOKERY'
  | 'POSTGRADUATE_DIPLOMA_EDUCATION'
  | 'MASTER_OF_EDUCATION'
  | 'MASTER_BUSINESS_ADMINISTRATION'
  | 'MSC_INFORMATION_TECHNOLOGY'
  | 'MSC_INFORMATION_MANAGEMENT'
  | 'MSC_INFORMATION_SYSTEMS'
  | 'MSC_NETWORK_ENGINEERING'
  | 'MSC_ARTIFICIAL_INTELLIGENCE';

export type AcademicYear = 'YEAR_1' | 'YEAR_2' | 'YEAR_3' | 'YEAR_4';

export type Semester = 'SEMESTER_1' | 'SEMESTER_2';

export type NextStep = 'ONBOARDING' | 'DASHBOARD';

export interface MessageResponse {
  message: string;
}

export interface ResourceResponse {
  id: string;
  code: string;
  name: string;
  category: ResourceCategory;
  subcategory: string | null;
  description: string | null;
  location: string | null;
  capacity: number | null;
  quantity: number | null;
  status: ResourceStatus;
  bookable: boolean;
  movable: boolean;
  availableFrom: string | null;
  availableTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceRequest {
  code: string;
  name: string;
  category: ResourceCategory;
  subcategory?: string | null;
  description?: string | null;
  location?: string | null;
  capacity?: number | null;
  quantity?: number | null;
  status: ResourceStatus;
  bookable: boolean;
  movable: boolean;
  availableFrom?: string | null;
  availableTo?: string | null;
}

export interface UpdateResourceRequest {
  code?: string;
  name?: string;
  category?: ResourceCategory;
  subcategory?: string | null;
  description?: string | null;
  location?: string | null;
  capacity?: number | null;
  quantity?: number | null;
  status?: ResourceStatus;
  bookable?: boolean;
  movable?: boolean;
  availableFrom?: string | null;
  availableTo?: string | null;
}

export interface ResourceSummary {
  id: string;
  code: string;
  name: string;
}

export interface CreateBookingRequest {
  resourceId: string;
  startTime: string;
  endTime: string;
  purpose?: string;
}

export interface BookingDecisionRequest {
  reason: string;
}

export interface CancelBookingRequest {
  reason?: string;
}

export interface BookingResponse {
  id: string;
  resource: ResourceSummary;
  requesterId: string;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  purpose: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  decidedAt: string | null;
  cancelledAt: string | null;
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
  facultyName: StudentFaculty | null;
  programName: StudentProgram | null;
  academicYear: AcademicYear | null;
  semester: Semester | null;
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
}

export interface AdminProfileResponse {
  fullName: string | null;
  phoneNumber: string | null;
  employeeNumber: string | null;
}

export interface ManagerProfileResponse {
  firstName: string | null;
  lastName: string | null;
  preferredName: string | null;
  phoneNumber: string | null;
  employeeNumber: string | null;
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
  managerRole: ManagerRole | null;
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
}

export interface AdminProfileInput {
  fullName: string;
  phoneNumber?: string;
  employeeNumber: string;
}

export interface ManagerProfileInput {
  firstName: string;
  lastName: string;
  preferredName?: string;
  phoneNumber?: string;
  employeeNumber: string;
}

export interface StudentProfileInput {
  firstName: string;
  lastName: string;
  preferredName?: string;
  phoneNumber: string;
  registrationNumber: string;
  facultyName: StudentFaculty;
  programName: StudentProgram;
  academicYear: AcademicYear;
  semester: Semester;
  profileImageUrl?: string;
  emailNotificationsEnabled?: boolean;
  smsNotificationsEnabled?: boolean;
}

export interface CreateUserRequest {
  email: string;
  userType: UserType;
  sendInvite: boolean;
  studentProfile?: Partial<StudentProfileInput>;
  facultyProfile?: FacultyProfileInput | null;
  adminProfile?: AdminProfileInput | null;
  managerProfile?: ManagerProfileInput | null;
  managerRole?: ManagerRole | null;
}

export interface UpdateUserRequest {
  accountStatus?: AccountStatus;
  studentProfile?: StudentProfileInput | null;
  facultyProfile?: FacultyProfileInput | null;
  adminProfile?: AdminProfileInput | null;
  managerProfile?: ManagerProfileInput | null;
}

export interface ManagerRoleUpdateRequest {
  managerRole: ManagerRole;
}

export interface StudentOnboardingRequest {
  firstName: string;
  lastName: string;
  preferredName?: string;
  phoneNumber: string;
  registrationNumber: string;
  facultyName: StudentFaculty;
  programName: StudentProgram;
  academicYear: AcademicYear;
  semester: Semester;
  profileImageUrl?: string;
  emailNotificationsEnabled?: boolean;
  smsNotificationsEnabled?: boolean;
}
