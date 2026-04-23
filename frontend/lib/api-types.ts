export type UserType = 'STUDENT' | 'FACULTY' | 'ADMIN' | 'MANAGER';

export type AccountStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';

export type AuthDeliveryMethod = 'INVITE_EMAIL' | 'LOGIN_LINK_EMAIL' | 'PASSWORD_RECOVERY_EMAIL';

export type ManagerRole = 'CATALOG_MANAGER' | 'BOOKING_MANAGER' | 'TICKET_MANAGER';

export type AdminAction =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_SUSPENDED'
  | 'USER_ACTIVATED'
  | 'USER_DELETED'
  | 'INVITE_RESENT'
  | 'MANAGER_ROLE_CHANGED';

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CHECKED_IN' | 'COMPLETED' | 'NO_SHOW';

export type RecurrencePattern = 'NONE' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export type CheckInStatus = 'PENDING' | 'CHECKED_IN' | 'NO_SHOW';

export type ModificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type NotificationDomain = 'TICKET' | 'BOOKING' | 'CATALOG' | 'SYSTEM';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED' | 'CRITICAL';

export type NotificationDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export type ResourceCategory =
  | 'SPACES'
  | 'TECHNICAL_EQUIPMENT'
  | 'MAINTENANCE_AND_CLEANING'
  | 'SPORTS'
  | 'EVENT_AND_DECORATION'
  | 'GENERAL_UTILITY'
  | 'TRANSPORT_AND_LOGISTICS';

export type ResourceStatus = 'ACTIVE' | 'OUT_OF_SERVICE' | 'MAINTENANCE' | 'INACTIVE';

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export type ResourceManagedByRole =
  | 'CATALOG_MANAGER'
  | 'LIBRARY_MANAGER'
  | 'TECHNICAL_MANAGER'
  | 'FACILITIES_MANAGER'
  | 'MAINTENANCE_MANAGER'
  | 'SPORTS_MANAGER'
  | 'EVENTS_MANAGER'
  | 'TRANSPORT_MANAGER';

export type BuildingType =
  | 'ACADEMIC'
  | 'LIBRARY'
  | 'ADMINISTRATIVE'
  | 'SPORTS'
  | 'OUTDOOR'
  | 'OTHER';

export type LocationType =
  | 'BUILDING'
  | 'ROOM'
  | 'LAB'
  | 'HALL'
  | 'LIBRARY_SPACE'
  | 'EVENT_SPACE'
  | 'SPORTS_AREA'
  | 'OUTDOOR_AREA'
  | 'STORAGE'
  | 'OTHER';

export type LocationWing = 'LEFT_WING' | 'RIGHT_WING' | 'NONE';

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
  resourceType: ResourceTypeDetails | null;
  locationDetails: LocationDetails | null;
  features: ResourceFeatureDetails[];
  availabilityWindows: ResourceAvailabilityWindow[];
  images: ResourceImageDetails[];
}

export interface ResourceListItem {
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
  resourceTypeName: string | null;
  locationName: string | null;
  buildingName: string | null;
  managedByRole: ResourceManagedByRole | null;
}

export interface ResourceListPage {
  items: ResourceListItem[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface ResourceOption {
  id: string;
  code: string;
  name: string;
  category: ResourceCategory;
  subcategory: string | null;
  locationName: string | null;
  status: ResourceStatus;
  bookable: boolean;
}

export interface ResourceStats {
  totalResources: number;
  activeResources: number;
  bookableResources: number;
  maintenanceResources: number;
  outOfServiceResources: number;
  inactiveResources: number;
  locationCount: number;
}

export interface ResourceLookups {
  types: ResourceTypeOption[];
  locations: LocationOption[];
  features: ResourceFeatureOption[];
  managedRoles: ManagedByRoleOption[];
}

export interface CreateResourceRequest {
  code: string;
  name: string;
  description?: string | null;
  resourceTypeId: string;
  locationId: string | null;
  capacity?: number | null;
  quantity?: number | null;
  status: ResourceStatus;
  bookable: boolean;
  movable: boolean;
  availableFrom?: string | null;
  availableTo?: string | null;
  managedByRole?: ResourceManagedByRole | null;
  featureCodes?: string[] | null;
  availabilityWindows?: AvailabilityWindowInput[] | null;
}

export interface UpdateResourceRequest {
  name?: string;
  description?: string | null;
  resourceTypeId?: string;
  locationId?: string | null;
  capacity?: number | null;
  quantity?: number | null;
  status?: ResourceStatus;
  bookable?: boolean;
  movable?: boolean;
  availableFrom?: string | null;
  availableTo?: string | null;
  managedByRole?: ResourceManagedByRole | null;
  featureCodes?: string[] | null;
  availabilityWindows?: AvailabilityWindowInput[] | null;
}

export interface ResourceTypeDetails {
  id: string;
  code: string;
  name: string;
  category: ResourceCategory;
}

export interface LocationDetails {
  id: string;
  buildingId: string | null;
  locationName: string;
  buildingCode: string | null;
  buildingName: string | null;
  wing: LocationWing | null;
  floor: string | null;
  roomCode: string | null;
  locationType: LocationType;
}

export interface ResourceFeatureDetails {
  code: string;
  name: string;
}

export interface AvailabilityWindowInput {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface ResourceAvailabilityWindow {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface ResourceImageDetails {
  imageUrl: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface ResourceTypeOption {
  id: string;
  code: string;
  name: string;
  category: ResourceCategory;
  isBookableDefault: boolean;
  isMovableDefault: boolean;
  locationRequired: boolean;
  capacityEnabled: boolean;
  capacityRequired: boolean;
  quantityEnabled: boolean;
  availabilityEnabled: boolean;
  featuresEnabled: boolean;
}

export interface CatalogueResourceTypeResponse {
  id: string;
  code: string;
  name: string;
  category: ResourceCategory;
  description: string | null;
  isBookableDefault: boolean;
  isMovableDefault: boolean;
  locationRequired: boolean;
  capacityEnabled: boolean;
  capacityRequired: boolean;
  quantityEnabled: boolean;
  availabilityEnabled: boolean;
  featuresEnabled: boolean;
}

export interface CreateResourceTypeRequest {
  code: string;
  name: string;
  category: ResourceCategory;
  description?: string | null;
  isBookableDefault: boolean;
  isMovableDefault: boolean;
  locationRequired: boolean;
  capacityEnabled: boolean;
  capacityRequired: boolean;
  quantityEnabled: boolean;
  availabilityEnabled: boolean;
  featuresEnabled: boolean;
}

export interface UpdateResourceTypeRequest {
  code?: string;
  name?: string;
  category?: ResourceCategory;
  description?: string | null;
  isBookableDefault?: boolean;
  isMovableDefault?: boolean;
  locationRequired?: boolean;
  capacityEnabled?: boolean;
  capacityRequired?: boolean;
  quantityEnabled?: boolean;
  availabilityEnabled?: boolean;
  featuresEnabled?: boolean;
}

export interface LocationOption {
  id: string;
  buildingId: string | null;
  locationName: string;
  buildingCode: string | null;
  buildingName: string | null;
  wing: LocationWing | null;
  floor: string | null;
  roomCode: string | null;
  locationType: LocationType;
}

export interface ResourceFeatureOption {
  id: string;
  code: string;
  name: string;
}

export interface ManagedByRoleOption {
  value: ResourceManagedByRole;
  label: string;
}

export interface ResourceSummary {
  id: string;
  code: string;
  name: string;
}

export interface BuildingResponse {
  id: string;
  buildingName: string;
  buildingCode: string;
  buildingType: BuildingType;
  hasWings: boolean;
  leftWingPrefix: string | null;
  rightWingPrefix: string | null;
  defaultPrefix: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBuildingRequest {
  buildingName: string;
  buildingCode: string;
  buildingType: BuildingType;
  hasWings: boolean;
  leftWingPrefix?: string | null;
  rightWingPrefix?: string | null;
  defaultPrefix?: string | null;
  description?: string | null;
  isActive?: boolean | null;
}

export interface UpdateBuildingRequest {
  buildingName?: string;
  buildingCode?: string;
  buildingType?: BuildingType;
  hasWings?: boolean;
  leftWingPrefix?: string | null;
  rightWingPrefix?: string | null;
  defaultPrefix?: string | null;
  description?: string | null;
  isActive?: boolean | null;
}

export interface CatalogueLocationResponse {
  id: string;
  buildingId: string | null;
  buildingName: string | null;
  buildingCode: string | null;
  buildingHasWings: boolean;
  wing: LocationWing | null;
  floor: string | null;
  roomCode: string | null;
  locationName: string;
  locationType: LocationType;
  description: string | null;
}

export interface CreateLocationRequest {
  buildingId: string;
  wing?: LocationWing | null;
  floor?: string | null;
  roomCode?: string | null;
  locationName: string;
  locationType: LocationType;
  description?: string | null;
}

export interface UpdateLocationRequest {
  buildingId?: string;
  wing?: LocationWing | null;
  floor?: string | null;
  roomCode?: string | null;
  locationName?: string;
  locationType?: LocationType;
  description?: string | null;
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
  requesterRegistrationNumber: string | null;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  purpose: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  decidedAt: string | null;
  cancelledAt: string | null;
  checkInStatus: CheckInStatus | null;
  checkedInAt: string | null;
}

export interface TimeRangeResponse {
  startTime: string;
  endTime: string;
}

export interface ResourceRemainingRangesResponse {
  resourceId: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  remainingRanges: TimeRangeResponse[];
}

export interface CreateRecurringBookingRequest {
  resourceId: string;
  recurrencePattern: RecurrencePattern;
  startDate: string;
  endDate?: string | null;
  occurrenceCount?: number | null;
  startTime: string;
  endTime: string;
  purpose?: string | null;
}

export interface RecurringBookingResponse {
  id: string;
  resource: ResourceSummary;
  requesterId: string;
  recurrencePattern: RecurrencePattern;
  startDate: string;
  endDate: string | null;
  occurrenceCount: number | null;
  startTime: string;
  endTime: string;
  purpose: string | null;
  active: boolean;
  createdAt: string;
}

export interface RequestModificationRequest {
  requestedStartTime: string;
  requestedEndTime: string;
  reason?: string;
}

export interface ModificationDecisionRequest {
  decisionReason?: string;
}

export interface BookingModificationResponse {
  id: string;
  bookingId: string;
  requestedStartTime: string;
  requestedEndTime: string;
  reason: string | null;
  status: ModificationStatus;
  decidedAt: string | null;
  decisionReason: string | null;
}

export interface CheckInRequest {
  notes?: string;
}

export interface CheckInResponse {
  bookingId: string;
  checkInStatus: CheckInStatus;
  checkedInAt: string | null;
}

export interface NotificationLinkResponse {
  ticketId: string | null;
  ticketCommentId: string | null;
  bookingId: string | null;
  bookingModificationId: string | null;
  resourceId: string | null;
  locationId: string | null;
  buildingId: string | null;
  resourceTypeId: string | null;
  userId: string | null;
}

export interface NotificationResponse {
  id: string;
  eventId: string;
  domain: NotificationDomain;
  type: string;
  severity: NotificationSeverity;
  title: string;
  body: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
  actionUrl: string | null;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
  emailDeliveryStatus: NotificationDeliveryStatus | null;
  links: NotificationLinkResponse[];
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}

export interface NotificationPreferencesResponse {
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

export interface UpdateNotificationPreferencesRequest {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
}

export interface NotificationDeliveryResponse {
  id: string;
  recipientId: string;
  eventId: string;
  recipientUserId: string;
  recipientEmail: string;
  domain: NotificationDomain;
  type: string;
  severity: NotificationSeverity;
  title: string;
  status: NotificationDeliveryStatus;
  attemptCount: number;
  nextAttemptAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  code?: string;
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

export interface AuditLogResponse {
  id: string;
  action: AdminAction;
  performedById: string | null;
  performedByEmail: string;
  targetUserId: string | null;
  targetUserEmail: string;
  details: string | null;
  createdAt: string;
}

export interface AuditLogPageResponse {
  items: AuditLogResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface AuditLogFilters {
  action?: AdminAction | '';
  performedById?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
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
  department: string;
  designation: string;
}

export interface AdminProfileInput {
  fullName: string;
  phoneNumber?: string;
}

export interface ManagerProfileInput {
  firstName: string;
  lastName: string;
  preferredName?: string;
  phoneNumber?: string;
}

export interface StudentProfileInput {
  firstName: string;
  lastName: string;
  preferredName?: string;
  phoneNumber: string;
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

export interface BulkStudentImportEntry {
  rowNumber: number;
  email: string;
}

export interface BulkStudentImportRequest {
  students: BulkStudentImportEntry[];
}

export type BulkStudentImportStatus =
  | 'VALID'
  | 'CREATED'
  | 'INVALID_EMAIL'
  | 'DUPLICATE_IN_FILE'
  | 'ALREADY_EXISTS'
  | 'FAILED';

export interface BulkStudentImportSummary {
  totalRows: number;
  validRows: number;
  createdRows: number;
  skippedRows: number;
  failedRows: number;
  invalidRows: number;
  duplicateRows: number;
  existingRows: number;
}

export interface BulkStudentImportRowResult {
  rowNumber: number;
  email: string;
  normalizedEmail: string | null;
  status: BulkStudentImportStatus;
  message: string;
  userId: string | null;
}

export interface BulkStudentImportResponse {
  summary: BulkStudentImportSummary;
  results: BulkStudentImportRowResult[];
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
  facultyName: StudentFaculty;
  programName: StudentProgram;
  academicYear: AcademicYear;
  semester: Semester;
  profileImageUrl?: string;
}

// Ticket management
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED';
export type TicketCategory = 'ELECTRICAL' | 'NETWORK' | 'EQUIPMENT' | 'FURNITURE' | 'CLEANLINESS' | 'FACILITY_DAMAGE' | 'ACCESS_SECURITY' | 'OTHER';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketAnalyticsBucket = 'DAY' | 'WEEK' | 'MONTH';

export interface TicketAnalyticsQuery {
  from?: string;
  to?: string;
  bucket?: TicketAnalyticsBucket;
  assigneeId?: string;
  unassignedOnly?: boolean;
  category?: TicketCategory;
  priority?: TicketPriority;
}

export interface TicketAnalyticsSummary {
  totalTickets: number;
  activeBacklog: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  rejected: number;
  unassignedOpen: number;
  urgentActive: number;
  positiveResolutionRate: number | null;
  rejectionRate: number | null;
}

export interface TicketAnalyticsTiming {
  averageActiveAgeMinutes: number | null;
  averageTimeToAssignMinutes: number | null;
  averageTimeToAcceptMinutes: number | null;
  averageTimeToResolveMinutes: number | null;
  averageTimeInProgressMinutes: number | null;
  averageClosureLagMinutes: number | null;
}

export interface TicketAnalyticsCommunication {
  totalComments: number;
  averageCommentsPerTicket: number;
  ticketsWithAttachments: number;
  totalAttachments: number;
  averageAttachmentsPerTicket: number;
}

export interface TicketAnalyticsAssignment {
  totalAssignmentEvents: number;
  reassignmentEvents: number;
  ticketsAssignedInWindow: number;
}

export interface TicketAnalyticsBreakdownRow {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface TicketAnalyticsTrendPoint {
  bucketStart: string;
  bucketEnd: string;
  created: number;
  resolved: number;
  rejected: number;
  activeBacklog: number;
}

export interface TicketAnalyticsAttentionTicket {
  id: string;
  ticketCode: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedToId: string | null;
  assignedToName: string | null;
  reportedByEmail: string;
  createdAt: string;
  lastStatusChangedAt: string;
  ageMinutes: number;
  reason: string;
}

export interface TicketAnalyticsStatusEvent {
  id: string;
  ticketId: string;
  ticketCode: string | null;
  title: string | null;
  oldStatus: TicketStatus | null;
  newStatus: TicketStatus;
  changedById: string;
  changedByEmail: string;
  note: string | null;
  changedAt: string;
}

export interface TicketAnalyticsManagerPerformance {
  assigneeId: string;
  assigneeName: string | null;
  assigneeEmail: string;
  assignedTotal: number;
  active: number;
  urgentActive: number;
  resolvedClosed: number;
  rejected: number;
  averageTimeToAcceptMinutes: number | null;
  averageTimeToResolveMinutes: number | null;
  assignmentEvents: number;
  reassignmentEvents: number;
}

export interface TicketAnalyticsSlaRow {
  priority: TicketPriority;
  total: number;
  compliant: number;
  complianceRate: number | null;
  targetMinutes: number;
}

export interface TicketAnalyticsSla {
  ttfrCompliance: TicketAnalyticsSlaRow[];
  ttrCompliance: TicketAnalyticsSlaRow[];
  overallTtfrComplianceRate: number | null;
  overallTtrComplianceRate: number | null;
}

export interface TicketAnalyticsResponse {
  from: string;
  to: string;
  bucket: TicketAnalyticsBucket;
  summary: TicketAnalyticsSummary;
  timing: TicketAnalyticsTiming;
  communication: TicketAnalyticsCommunication;
  assignment: TicketAnalyticsAssignment;
  statusBreakdown: TicketAnalyticsBreakdownRow[];
  priorityBreakdown: TicketAnalyticsBreakdownRow[];
  categoryBreakdown: TicketAnalyticsBreakdownRow[];
  trends: TicketAnalyticsTrendPoint[];
  attentionTickets: TicketAnalyticsAttentionTicket[];
  recentStatusEvents: TicketAnalyticsStatusEvent[];
  managerPerformance: TicketAnalyticsManagerPerformance[];
  sla: TicketAnalyticsSla;
}

export interface TicketSummaryResponse {
  id: string;
  ticketCode: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  reportedById: string | null;
  reportedByEmail: string;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: string;
}

export interface TicketResponse extends TicketSummaryResponse {
  assignedToEmail: string | null;
  assignedToName: string | null;
  resourceId: string | null;
  locationId: string | null;
  resolutionNotes: string | null;
  rejectionReason: string | null;
  contactNote: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  updatedAt: string;
}

export interface TicketStatusUpdateRequest {
  newStatus: TicketStatus;
  note?: string;
  resolutionNotes?: string;
  rejectionReason?: string;
}

export interface AssignTicketRequest {
  assignedTo: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  contactNote?: string;
  resourceId?: string;
}

export interface UpdateTicketRequest {
  priority?: TicketPriority;
  contactNote?: string;
}

export interface TicketCommentResponse {
  id: string;
  ticketId: string;
  userId: string;
  userEmail: string;
  commentText: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddCommentRequest {
  commentText: string;
}

export interface UpdateCommentRequest {
  commentText: string;
}

export interface TicketAttachmentResponse {
  id: string;
  ticketId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
}

export interface TicketStatusHistoryResponse {
  id: string;
  ticketId: string;
  oldStatus: TicketStatus | null;
  newStatus: TicketStatus;
  changedByEmail: string;
  note: string | null;
  changedAt: string;
}
