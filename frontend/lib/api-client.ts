import {
  type AuditLogFilters,
  type AuditLogPageResponse,
  type AccountStatus,
  type AddCommentRequest,
  type UpdateCommentRequest,
  type AssignTicketRequest,
  type BuildingResponse,
  type BulkStudentImportRequest,
  type BulkStudentImportResponse,
  type BookingDecisionRequest,
  type BookingModificationResponse,
  type BookingResponse,
  type CancelBookingRequest,
  type CatalogueResourceTypeResponse,
  type CatalogueLocationResponse,
  type CheckInResponse,
  type CreateBuildingRequest,
  type CreateBookingRequest,
  type CreateResourceTypeRequest,
  type CreateLocationRequest,
  type CreateRecurringBookingRequest,
  type CreateResourceRequest,
  type CreateTicketRequest,
  type CreateUserRequest,
  type ErrorResponse,
  type ManagerRole,
  type ManagerRoleUpdateRequest,
  type ManagedByRoleOption,
  type MessageResponse,
  type ModificationDecisionRequest,
  type NotificationDeliveryResponse,
  type NotificationDeliveryStatus,
  type NotificationDomain,
  type NotificationPreferencesResponse,
  type NotificationResponse,
  type NotificationUnreadCountResponse,
  type UpdateNotificationPreferencesRequest,
  type LocationOption,
  type RecurringBookingResponse,
  type RequestModificationRequest,
  type ResourceRemainingRangesResponse,
  type ResourceFeatureOption,
  type ResourceListPage,
  type ResourceLookups,
  type ResourceOption,
  type ResourceResponse,
  type ResourceStats,
  type ResourceTypeOption,
  type SessionSyncResponse,
  type StudentOnboardingRequest,
  type StudentOnboardingStateResponse,
  type TicketAttachmentResponse,
  type TicketAnalyticsQuery,
  type TicketAnalyticsResponse,
  type TicketCategory,
  type TicketCommentResponse,
  type TicketPriority,
  type TicketResponse,
  type TicketStatus,
  type TicketStatusHistoryResponse,
  type TicketStatusUpdateRequest,
  type TicketSummaryResponse,
  type UpdateBuildingRequest,
  type UpdateLocationRequest,
  type UpdateResourceRequest,
  type UpdateResourceTypeRequest,
  type UpdateTicketRequest,
  type UpdateUserRequest,
  type UserResponse,
  type UserType,
} from '@/lib/api-types';
import { getServerApiBaseUrl } from '@/lib/backend-url';

function resolveApiBaseUrl() {
  if (typeof window !== 'undefined') {
    return '';
  }

  const apiBaseUrl = getServerApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error('API base URL is not configured.');
  }

  return apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details: ErrorResponse | null;

  constructor(status: number, message: string, details: ErrorResponse | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  accessToken?: string | null;
  body?: unknown;
  cache?: RequestCache;
  retryOnUpstreamFailure?: boolean;
}

const RETRYABLE_UPSTREAM_STATUSES = new Set([502, 503, 504]);
const ONBOARDING_REQUIRED_ERROR_CODE = 'ONBOARDING_REQUIRED';
const STUDENT_ONBOARDING_PATH = '/students/onboarding';

const STATUS_MESSAGES: Partial<Record<number, string>> = {
  0: 'Cannot reach the backend service. Please check that the backend is running and try again.',
  400: 'Some information is missing or invalid. Please review the form and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested item could not be found.',
  409: 'This record conflicts with an existing item.',
  500: 'The server hit an unexpected problem. Please try again.',
  502: 'The frontend cannot reach the backend service. Please make sure the backend is running.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
  504: 'The backend took too long to respond. Please try again.',
};

function normalizeErrorMessage(message: string) {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return null;
  }

  if (lower.includes('invalid login credentials')) {
    return 'The email or password is incorrect.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Confirm your email before signing in.';
  }

  if (lower.includes('networkerror') || lower.includes('failed to fetch') || lower.includes('load failed')) {
    return 'The request could not reach the service. Check your connection and try again.';
  }

  if (lower.includes('jwt expired') || lower.includes('invalid jwt') || lower.includes('unauthorized')) {
    return 'Your session has expired. Please sign in again.';
  }

  return trimmed;
}

function shouldRetryRequest(response: Response, options: RequestOptions, attempt: number) {
  const method = options.method ?? 'GET';
  const allowRetry = method === 'GET' || options.retryOnUpstreamFailure === true;
  return allowRetry && attempt < 1 && RETRYABLE_UPSTREAM_STATUSES.has(response.status);
}

function shouldRetryNetworkError(options: RequestOptions, attempt: number) {
  const method = options.method ?? 'GET';
  const allowRetry = method === 'GET' || options.retryOnUpstreamFailure === true;
  return allowRetry && attempt < 1;
}

async function waitBeforeRetry() {
  await new Promise((resolve) => {
    setTimeout(resolve, 250);
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function isOnboardingRequiredError(status: number, details: ErrorResponse | null) {
  if (status !== 403 || !details) {
    return false;
  }

  if (details.code === ONBOARDING_REQUIRED_ERROR_CODE) {
    return true;
  }

  return details.message.toLowerCase().includes('complete onboarding');
}

function redirectToOnboardingIfRequired(status: number, details: ErrorResponse | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!isOnboardingRequiredError(status, details)) {
    return;
  }

  if (window.location.pathname !== STUDENT_ONBOARDING_PATH) {
    window.location.assign(STUDENT_ONBOARDING_PATH);
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers({
    Accept: 'application/json',
  });

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`);
  }

  let response: Response | null = null;

  for (let attempt = 0; attempt <= 1; attempt += 1) {
    try {
      response = await fetch(`${resolveApiBaseUrl()}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        cache: options.cache ?? 'no-store',
      });
    } catch (error) {
      if (error instanceof TypeError && shouldRetryNetworkError(options, attempt)) {
        await waitBeforeRetry();
        continue;
      }

      if (error instanceof TypeError) {
        throw new ApiError(
          0,
          'Cannot reach the backend API. Make sure the backend service is running and reachable at NEXT_PUBLIC_API_URL.',
        );
      }

      throw error;
    }

    if (response.ok || !shouldRetryRequest(response, options, attempt)) {
      break;
    }

    await waitBeforeRetry();
  }

  if (!response) {
    throw new ApiError(0, 'Request failed before receiving a response from the backend API.');
  }

  if (!response.ok) {
    let details: ErrorResponse | null = null;

    try {
      details = await response.json();
    } catch {
      details = null;
    }

    redirectToOnboardingIfRequired(response.status, details);

    throw new ApiError(
      response.status,
      details?.message ?? `Request failed with status ${response.status}.`,
      details,
    );
  }

  return parseResponse<T>(response);
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return normalizeErrorMessage(error.details?.message ?? error.message)
      ?? STATUS_MESSAGES[error.status]
      ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return normalizeErrorMessage(error.message) ?? fallback;
  }

  return fallback;
}

export async function requestLoginLink(email: string) {
  return request<MessageResponse>('/api/auth/login-link/request', {
    method: 'POST',
    body: { email },
  });
}

export async function requestPasswordReset(email: string) {
  return request<MessageResponse>('/api/auth/password-reset/request', {
    method: 'POST',
    body: { email },
  });
}

export async function syncSession(accessToken: string) {
  return request<SessionSyncResponse>('/api/auth/session/sync', {
    method: 'POST',
    accessToken,
    retryOnUpstreamFailure: true,
  });
}

export async function getCurrentUser(accessToken: string) {
  return request<UserResponse>('/api/auth/me', {
    accessToken,
  });
}

function clearResourceReadCaches() {
  resourceLookupsCache.clear();
  resourceOptionsCache.clear();
}

export interface UserFilters {
  email?: string;
  userType?: UserType | '';
  accountStatus?: AccountStatus | '';
  managerRole?: ManagerRole | '';
}

export async function listUsers(accessToken: string, filters: UserFilters = {}) {
  const params = new URLSearchParams();

  if (filters.email) {
    params.set('email', filters.email);
  }
  if (filters.userType) {
    params.set('userType', filters.userType);
  }
  if (filters.accountStatus) {
    params.set('accountStatus', filters.accountStatus);
  }
  if (filters.managerRole) {
    params.set('managerRole', filters.managerRole);
  }

  const query = params.toString();
  return request<UserResponse[]>(`/api/admin/users${query ? `?${query}` : ''}`, {
    accessToken,
  });
}

export async function getUser(accessToken: string, userId: string) {
  return request<UserResponse>(`/api/admin/users/${userId}`, {
    accessToken,
  });
}

export async function createUser(accessToken: string, payload: CreateUserRequest) {
  return request<UserResponse>('/api/admin/users', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function previewBulkStudentImport(accessToken: string, payload: BulkStudentImportRequest) {
  return request<BulkStudentImportResponse>('/api/admin/users/bulk-students/preview', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function importBulkStudents(accessToken: string, payload: BulkStudentImportRequest) {
  return request<BulkStudentImportResponse>('/api/admin/users/bulk-students', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function updateUser(accessToken: string, userId: string, payload: UpdateUserRequest) {
  return request<UserResponse>(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export async function replaceManagerRole(
  accessToken: string,
  userId: string,
  payload: ManagerRoleUpdateRequest,
) {
  return request<UserResponse>(`/api/admin/users/${userId}/manager-role`, {
    method: 'PUT',
    accessToken,
    body: payload,
  });
}

export async function resendInvite(accessToken: string, userId: string) {
  return request<MessageResponse>(`/api/admin/users/${userId}/invite`, {
    method: 'POST',
    accessToken,
  });
}

export async function deleteUser(accessToken: string, userId: string) {
  return request<MessageResponse>(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function listAuditLogs(accessToken: string, filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();

  if (filters.action) {
    params.set('action', filters.action);
  }
  if (filters.performedById) {
    params.set('performedById', filters.performedById);
  }
  if (filters.from) {
    params.set('from', filters.from);
  }
  if (filters.to) {
    params.set('to', filters.to);
  }
  if (filters.page !== undefined) {
    params.set('page', String(filters.page));
  }
  if (filters.size !== undefined) {
    params.set('size', String(filters.size));
  }

  const query = params.toString();
  return request<AuditLogPageResponse>(`/api/admin/audit-logs${query ? `?${query}` : ''}`, {
    accessToken,
  });
}

export async function getUserAuditLogs(accessToken: string, userId: string, filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();

  if (filters.page !== undefined) {
    params.set('page', String(filters.page));
  }
  if (filters.size !== undefined) {
    params.set('size', String(filters.size));
  }

  const query = params.toString();
  return request<AuditLogPageResponse>(
    `/api/admin/audit-logs/user/${encodeURIComponent(userId)}${query ? `?${query}` : ''}`,
    { accessToken },
  );
}

export async function getStudentOnboarding(accessToken: string) {
  return request<StudentOnboardingStateResponse>('/api/students/me/onboarding', {
    accessToken,
  });
}

export async function completeStudentOnboarding(accessToken: string, payload: StudentOnboardingRequest) {
  return request<UserResponse>('/api/students/me/onboarding', {
    method: 'PUT',
    accessToken,
    body: payload,
  });
}

const resourceLookupsCache = new Map<string, Promise<ResourceLookups>>();
const resourceOptionsCache = new Map<string, Promise<ResourceOption[]>>();

export interface ResourceListFilters {
  search?: string;
  category?: string;
  status?: string;
  location?: string;
  page?: number;
  size?: number;
}

export interface ResourceOptionFilters {
  status?: string;
  bookable?: boolean;
}

function buildResourceListQuery(filters: ResourceListFilters) {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.category) {
    params.set('category', filters.category);
  }
  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.location?.trim()) {
    params.set('location', filters.location.trim());
  }
  if (filters.page !== undefined) {
    params.set('page', String(filters.page));
  }
  if (filters.size !== undefined) {
    params.set('size', String(filters.size));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildResourceOptionQuery(filters: ResourceOptionFilters) {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.bookable !== undefined) {
    params.set('bookable', String(filters.bookable));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function listResourcePage(accessToken: string, filters: ResourceListFilters = {}) {
  return request<ResourceListPage>(`/api/resources${buildResourceListQuery(filters)}`, {
    accessToken,
  });
}

export async function listResources(accessToken: string, filters: ResourceListFilters = {}) {
  const page = await listResourcePage(accessToken, { size: 300, ...filters });
  return page.items;
}

export async function getResource(accessToken: string, resourceId: string) {
  return request<ResourceResponse>(`/api/resources/${resourceId}`, { accessToken });
}

export async function listResourceOptions(accessToken: string, filters: ResourceOptionFilters = {}) {
  const query = buildResourceOptionQuery(filters);
  const cacheKey = `${accessToken}:${query}`;
  const cached = resourceOptionsCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const pending = request<ResourceOption[]>(`/api/resources/options${query}`, {
    accessToken,
  }).catch((error) => {
    resourceOptionsCache.delete(cacheKey);
    throw error;
  });

  resourceOptionsCache.set(cacheKey, pending);
  return pending;
}

export async function getResourceStats(accessToken: string) {
  return request<ResourceStats>('/api/resources/stats', {
    accessToken,
  });
}

export async function getResourceLookups(accessToken: string) {
  const cached = resourceLookupsCache.get(accessToken);

  if (cached) {
    return cached;
  }

  const pending = request<ResourceLookups>('/api/resources/lookups', {
    accessToken,
  }).catch((error) => {
    resourceLookupsCache.delete(accessToken);
    throw error;
  });

  resourceLookupsCache.set(accessToken, pending);
  return pending;
}

export async function listResourceTypeOptions(accessToken: string) {
  return request<ResourceTypeOption[]>('/api/resources/lookups/types', {
    accessToken,
  });
}

export async function listLocationOptions(accessToken: string) {
  return request<LocationOption[]>('/api/resources/lookups/locations', {
    accessToken,
  });
}

export async function listResourceFeatureOptions(accessToken: string) {
  return request<ResourceFeatureOption[]>('/api/resources/lookups/features', {
    accessToken,
  });
}

export async function listManagedByRoleOptions(accessToken: string) {
  return request<ManagedByRoleOption[]>('/api/resources/lookups/managed-roles', {
    accessToken,
  });
}

export async function createResource(accessToken: string, payload: CreateResourceRequest) {
  const resource = await request<ResourceResponse>('/api/resources', {
    method: 'POST',
    accessToken,
    body: payload,
  });
  clearResourceReadCaches();
  return resource;
}

export async function updateResource(accessToken: string, resourceId: string, payload: UpdateResourceRequest) {
  const resource = await request<ResourceResponse>(`/api/resources/${resourceId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
  clearResourceReadCaches();
  return resource;
}

export async function deleteResource(accessToken: string, resourceId: string) {
  const response = await request<MessageResponse>(`/api/resources/${resourceId}`, {
    method: 'DELETE',
    accessToken,
  });
  clearResourceReadCaches();
  return response;
}

export async function listBuildings(accessToken: string) {
  return request<BuildingResponse[]>('/api/admin/buildings', {
    accessToken,
  });
}

export async function createBuilding(accessToken: string, payload: CreateBuildingRequest) {
  return request<BuildingResponse>('/api/admin/buildings', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function updateBuilding(accessToken: string, buildingId: string, payload: UpdateBuildingRequest) {
  return request<BuildingResponse>(`/api/admin/buildings/${buildingId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export async function deactivateBuilding(accessToken: string, buildingId: string) {
  return request<MessageResponse>(`/api/admin/buildings/${buildingId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function listCatalogueBuildings(accessToken: string) {
  return request<BuildingResponse[]>('/api/catalog/buildings', {
    accessToken,
  });
}

export async function listCatalogueLocations(accessToken: string) {
  return request<CatalogueLocationResponse[]>('/api/catalog/locations', {
    accessToken,
  });
}

export async function createCatalogueLocation(accessToken: string, payload: CreateLocationRequest) {
  return request<CatalogueLocationResponse>('/api/catalog/locations', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function updateCatalogueLocation(accessToken: string, locationId: string, payload: UpdateLocationRequest) {
  return request<CatalogueLocationResponse>(`/api/catalog/locations/${locationId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export async function deleteCatalogueLocation(accessToken: string, locationId: string) {
  return request<MessageResponse>(`/api/catalog/locations/${locationId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function listCatalogueResourceTypes(accessToken: string) {
  return request<CatalogueResourceTypeResponse[]>('/api/catalog/resource-types', {
    accessToken,
  });
}

export async function createCatalogueResourceType(accessToken: string, payload: CreateResourceTypeRequest) {
  return request<CatalogueResourceTypeResponse>('/api/catalog/resource-types', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function updateCatalogueResourceType(
  accessToken: string,
  resourceTypeId: string,
  payload: UpdateResourceTypeRequest,
) {
  return request<CatalogueResourceTypeResponse>(`/api/catalog/resource-types/${resourceTypeId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export async function deleteCatalogueResourceType(accessToken: string, resourceTypeId: string) {
  return request<MessageResponse>(`/api/catalog/resource-types/${resourceTypeId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function createBooking(accessToken: string, payload: CreateBookingRequest) {
  return request<BookingResponse>('/api/bookings', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function listMyBookings(accessToken: string) {
  return request<BookingResponse[]>('/api/bookings', {
    accessToken,
  });
}

export async function getMyBooking(accessToken: string, bookingId: string) {
  return request<BookingResponse>(`/api/bookings/${bookingId}`, {
    accessToken,
  });
}

export async function cancelMyBooking(accessToken: string, bookingId: string, payload?: CancelBookingRequest) {
  return request<BookingResponse>(`/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function getResourceRemainingRanges(
  accessToken: string,
  resourceId: string,
  date: string,
) {
  const query = new URLSearchParams({ date }).toString();
  return request<ResourceRemainingRangesResponse>(`/api/bookings/resources/${resourceId}/remaining-ranges?${query}`, {
    accessToken,
  });
}

export async function listAllBookings(accessToken: string) {
  return request<BookingResponse[]>('/api/admin/bookings', {
    accessToken,
  });
}

export async function approveBooking(accessToken: string, bookingId: string) {
  return request<BookingResponse>(`/api/admin/bookings/${bookingId}/approve`, {
    method: 'POST',
    accessToken,
  });
}

export async function rejectBooking(accessToken: string, bookingId: string, payload: BookingDecisionRequest) {
  return request<BookingResponse>(`/api/admin/bookings/${bookingId}/reject`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function cancelApprovedBookingAsManager(
  accessToken: string,
  bookingId: string,
  payload?: CancelBookingRequest,
) {
  return request<BookingResponse>(`/api/admin/bookings/${bookingId}/cancel`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

// Recurring Bookings
export async function createRecurringBooking(accessToken: string, payload: CreateRecurringBookingRequest) {
  return request<RecurringBookingResponse>('/api/recurring-bookings', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function listMyRecurringBookings(accessToken: string) {
  return request<RecurringBookingResponse[]>('/api/recurring-bookings', {
    accessToken,
  });
}

export async function getRecurringBooking(accessToken: string, bookingId: string) {
  return request<RecurringBookingResponse>(`/api/recurring-bookings/${bookingId}`, {
    accessToken,
  });
}

export async function deactivateRecurringBooking(accessToken: string, bookingId: string) {
  return request<RecurringBookingResponse>(`/api/recurring-bookings/${bookingId}`, {
    method: 'DELETE',
    accessToken,
  });
}

// Booking Modifications
export async function requestBookingModification(
  accessToken: string,
  bookingId: string,
  payload: RequestModificationRequest,
) {
  return request<BookingModificationResponse>(`/api/bookings/${bookingId}/modifications`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function listModificationsForBooking(bookingId: string) {
  return request<BookingModificationResponse[]>(`/api/bookings/${bookingId}/modifications`);
}

export async function listPendingModifications(accessToken: string) {
  return request<BookingModificationResponse[]>('/api/admin/modifications/pending', {
    accessToken,
  });
}

export async function approveModification(
  accessToken: string,
  modificationId: string,
  payload?: ModificationDecisionRequest,
) {
  return request<BookingModificationResponse>(`/api/admin/modifications/${modificationId}/approve`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function rejectModification(
  accessToken: string,
  modificationId: string,
  payload?: ModificationDecisionRequest,
) {
  return request<BookingModificationResponse>(`/api/admin/modifications/${modificationId}/reject`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

// Booking Check-In
export async function checkInBooking(accessToken: string, bookingId: string) {
  return request<CheckInResponse>(`/api/bookings/${bookingId}/check-in`, {
    method: 'POST',
    accessToken,
  });
}

export async function getCheckInStatus(bookingId: string) {
  return request<CheckInResponse>(`/api/bookings/${bookingId}/check-in`);
}

export async function markBookingAsNoShow(accessToken: string, bookingId: string) {
  return request<CheckInResponse>(`/api/admin/bookings/${bookingId}/mark-no-show`, {
    method: 'POST',
    accessToken,
  });
}

export async function completeBooking(accessToken: string, bookingId: string) {
  return request<CheckInResponse>(`/api/admin/bookings/${bookingId}/complete`, {
    method: 'POST',
    accessToken,
  });
}

// Notifications
export async function listNotifications(
  accessToken: string,
  options: { status?: 'all' | 'unread'; domain?: NotificationDomain; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.domain) params.set('domain', options.domain);
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  const query = params.toString();

  return request<NotificationResponse[]>(`/api/notifications${query ? `?${query}` : ''}`, {
    accessToken,
  });
}

export async function getNotificationUnreadCount(accessToken: string) {
  return request<NotificationUnreadCountResponse>('/api/notifications/unread-count', {
    accessToken,
  });
}

export async function markNotificationAsRead(accessToken: string, notificationId: string) {
  return request<NotificationResponse>(`/api/notifications/${notificationId}/read`, {
    method: 'POST',
    accessToken,
  });
}

export async function markAllNotificationsAsRead(accessToken: string) {
  return request<NotificationUnreadCountResponse>('/api/notifications/read-all', {
    method: 'POST',
    accessToken,
  });
}

export async function getNotificationPreferences(accessToken: string) {
  return request<NotificationPreferencesResponse>('/api/notifications/preferences', {
    accessToken,
  });
}

export async function updateNotificationPreferences(
  accessToken: string,
  payload: UpdateNotificationPreferencesRequest,
) {
  return request<NotificationPreferencesResponse>('/api/notifications/preferences', {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export async function listNotificationDeliveries(
  accessToken: string,
  options: { status?: NotificationDeliveryStatus; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  const query = params.toString();

  return request<NotificationDeliveryResponse[]>(`/api/admin/notifications/deliveries${query ? `?${query}` : ''}`, {
    accessToken,
  });
}

export async function uploadStudentProfileImage(accessToken: string, file: File) {
  const path = '/api/students/me/profile-image';
  const formData = new FormData();
  formData.set('file', file);

  let response: Response;

  try {
    response = await fetch(`${resolveApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(
        0,
        'Cannot reach the backend API. Make sure the backend service is running and reachable at NEXT_PUBLIC_API_URL.',
      );
    }

    throw error;
  }

  if (!response.ok) {
    let details: ErrorResponse | null = null;

    try {
      details = await response.json();
    } catch {
      details = null;
    }

    redirectToOnboardingIfRequired(response.status, details);

    throw new ApiError(
      response.status,
      details?.message ?? `Request failed with status ${response.status}.`,
      details,
    );
  }

  return parseResponse<UserResponse>(response);
}

// Ticket Management

export async function listMyTickets(
  accessToken: string,
  params?: { status?: TicketStatus; category?: TicketCategory; priority?: TicketPriority },
): Promise<TicketSummaryResponse[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.category) qs.set('category', params.category);
  if (params?.priority) qs.set('priority', params.priority);
  const query = qs.toString();
  const data = await request<unknown>(`/api/tickets${query ? `?${query}` : ''}`, { accessToken });
  return extractHalCollection<TicketSummaryResponse>(data);
}

export async function getTicketAnalytics(
  accessToken: string,
  params?: TicketAnalyticsQuery,
): Promise<TicketAnalyticsResponse> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.bucket) qs.set('bucket', params.bucket);
  if (params?.assigneeId) qs.set('assigneeId', params.assigneeId);
  if (params?.unassignedOnly !== undefined) qs.set('unassignedOnly', String(params.unassignedOnly));
  if (params?.category) qs.set('category', params.category);
  if (params?.priority) qs.set('priority', params.priority);
  const query = qs.toString();
  return request<TicketAnalyticsResponse>(`/api/tickets/analytics${query ? `?${query}` : ''}`, { accessToken });
}

export async function createTicket(accessToken: string, payload: CreateTicketRequest): Promise<TicketResponse> {
  return request<TicketResponse>('/api/tickets', { method: 'POST', accessToken, body: payload });
}

function ticketApiPath(ticketRef: string) {
  return `/api/tickets/${encodeURIComponent(ticketRef)}`;
}

function extractHalCollection<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const embedded = (data as Record<string, unknown>)?._embedded;
  if (!embedded || typeof embedded !== 'object') return [];
  const values = Object.values(embedded as Record<string, unknown>);
  if (values.length === 0) return [];
  const first = values[0];
  return Array.isArray(first) ? (first as T[]) : [];
}

export async function getTicket(accessToken: string, ticketRef: string): Promise<TicketResponse> {
  return request<TicketResponse>(ticketApiPath(ticketRef), { accessToken });
}

export async function updateTicket(
  accessToken: string,
  ticketRef: string,
  payload: UpdateTicketRequest,
): Promise<TicketResponse> {
  return request<TicketResponse>(ticketApiPath(ticketRef), { method: 'PATCH', accessToken, body: payload });
}

export async function deleteTicket(accessToken: string, ticketRef: string): Promise<void> {
  return request<void>(ticketApiPath(ticketRef), { method: 'DELETE', accessToken });
}

export async function listTicketComments(
  accessToken: string,
  ticketRef: string,
): Promise<TicketCommentResponse[]> {
  const data = await request<unknown>(`${ticketApiPath(ticketRef)}/comments`, { accessToken });
  return extractHalCollection<TicketCommentResponse>(data);
}

export async function addTicketComment(
  accessToken: string,
  ticketRef: string,
  payload: AddCommentRequest,
): Promise<TicketCommentResponse> {
  return request<TicketCommentResponse>(`${ticketApiPath(ticketRef)}/comments`, { method: 'POST', accessToken, body: payload });
}

export async function deleteTicketComment(
  accessToken: string,
  ticketRef: string,
  commentId: string,
): Promise<void> {
  return request<void>(`${ticketApiPath(ticketRef)}/comments/${commentId}`, { method: 'DELETE', accessToken });
}

export async function updateTicketComment(
  accessToken: string,
  ticketRef: string,
  commentId: string,
  payload: UpdateCommentRequest,
): Promise<TicketCommentResponse> {
  return request<TicketCommentResponse>(`${ticketApiPath(ticketRef)}/comments/${commentId}`, { method: 'PATCH', accessToken, body: payload });
}

export async function listTicketAttachments(
  accessToken: string,
  ticketRef: string,
): Promise<TicketAttachmentResponse[]> {
  const data = await request<unknown>(`${ticketApiPath(ticketRef)}/attachments`, { accessToken });
  return extractHalCollection<TicketAttachmentResponse>(data);
}

export async function uploadTicketAttachment(
  accessToken: string,
  ticketRef: string,
  file: File,
): Promise<TicketAttachmentResponse> {
  const path = `${ticketApiPath(ticketRef)}/attachments`;
  const formData = new FormData();
  formData.set('file', file);

  let response: Response;

  try {
    response = await fetch(`${resolveApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
      body: formData,
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(0, 'Cannot reach the backend API. Make sure the backend service is running and reachable at NEXT_PUBLIC_API_URL.');
    }
    throw error;
  }

  if (!response.ok) {
    let details: ErrorResponse | null = null;
    try { details = await response.json(); } catch { details = null; }

    redirectToOnboardingIfRequired(response.status, details);

    throw new ApiError(response.status, details?.message ?? `Upload failed with status ${response.status}.`, details);
  }

  return response.json() as Promise<TicketAttachmentResponse>;
}

export async function deleteTicketAttachment(
  accessToken: string,
  ticketRef: string,
  attachmentId: string,
): Promise<void> {
  return request<void>(`${ticketApiPath(ticketRef)}/attachments/${attachmentId}`, { method: 'DELETE', accessToken });
}

export async function getTicketHistory(
  accessToken: string,
  ticketRef: string,
): Promise<TicketStatusHistoryResponse[]> {
  const data = await request<unknown>(`${ticketApiPath(ticketRef)}/history`, { accessToken });
  return extractHalCollection<TicketStatusHistoryResponse>(data);
}

export async function updateTicketStatus(
  accessToken: string,
  ticketRef: string,
  payload: TicketStatusUpdateRequest,
): Promise<TicketResponse> {
  return request<TicketResponse>(`${ticketApiPath(ticketRef)}/status`, { method: 'PUT', accessToken, body: payload });
}

export async function assignTicket(
  accessToken: string,
  ticketRef: string,
  payload: AssignTicketRequest,
): Promise<TicketResponse> {
  return request<TicketResponse>(`${ticketApiPath(ticketRef)}/assign`, { method: 'PUT', accessToken, body: payload });
}
