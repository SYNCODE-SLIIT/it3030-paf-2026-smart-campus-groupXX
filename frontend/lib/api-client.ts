import {
  type AccountStatus,
  type AddCommentRequest,
  type BookingDecisionRequest,
  type BookingResponse,
  type CancelBookingRequest,
  type CreateBookingRequest,
  type CreateResourceRequest,
  type CreateTicketRequest,
  type CreateUserRequest,
  type ErrorResponse,
  type ManagerRole,
  type ManagerRoleUpdateRequest,
  type MessageResponse,
  type ResourceResponse,
  type SessionSyncResponse,
  type StudentOnboardingRequest,
  type StudentOnboardingStateResponse,
  type TicketAttachmentResponse,
  type TicketCategory,
  type TicketCommentResponse,
  type TicketPriority,
  type TicketResponse,
  type TicketStatus,
  type TicketStatusHistoryResponse,
  type TicketSummaryResponse,
  type UpdateResourceRequest,
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

export async function listResources(accessToken: string) {
  return request<ResourceResponse[]>('/api/resources', {
    accessToken,
  });
}

export async function createResource(accessToken: string, payload: CreateResourceRequest) {
  return request<ResourceResponse>('/api/resources', {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function updateResource(accessToken: string, resourceId: string, payload: UpdateResourceRequest) {
  return request<ResourceResponse>(`/api/resources/${resourceId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
}

export async function deleteResource(accessToken: string, resourceId: string) {
  return request<MessageResponse>(`/api/resources/${resourceId}`, {
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
  return request<TicketSummaryResponse[]>(`/api/tickets${query ? `?${query}` : ''}`, { accessToken });
}

export async function createTicket(accessToken: string, payload: CreateTicketRequest): Promise<TicketResponse> {
  return request<TicketResponse>('/api/tickets', { method: 'POST', accessToken, body: payload });
}

export async function getTicket(accessToken: string, ticketId: string): Promise<TicketResponse> {
  return request<TicketResponse>(`/api/tickets/${ticketId}`, { accessToken });
}

export async function updateTicket(
  accessToken: string,
  ticketId: string,
  payload: UpdateTicketRequest,
): Promise<TicketResponse> {
  return request<TicketResponse>(`/api/tickets/${ticketId}`, { method: 'PATCH', accessToken, body: payload });
}

export async function listTicketComments(
  accessToken: string,
  ticketId: string,
): Promise<TicketCommentResponse[]> {
  return request<TicketCommentResponse[]>(`/api/tickets/${ticketId}/comments`, { accessToken });
}

export async function addTicketComment(
  accessToken: string,
  ticketId: string,
  payload: AddCommentRequest,
): Promise<TicketCommentResponse> {
  return request<TicketCommentResponse>(`/api/tickets/${ticketId}/comments`, { method: 'POST', accessToken, body: payload });
}

export async function listTicketAttachments(
  accessToken: string,
  ticketId: string,
): Promise<TicketAttachmentResponse[]> {
  return request<TicketAttachmentResponse[]>(`/api/tickets/${ticketId}/attachments`, { accessToken });
}

export async function uploadTicketAttachment(
  accessToken: string,
  ticketId: string,
  file: File,
): Promise<TicketAttachmentResponse> {
  const path = `/api/tickets/${ticketId}/attachments`;
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
    throw new ApiError(response.status, details?.message ?? `Upload failed with status ${response.status}.`, details);
  }

  return response.json() as Promise<TicketAttachmentResponse>;
}

export async function deleteTicketAttachment(
  accessToken: string,
  ticketId: string,
  attachmentId: string,
): Promise<void> {
  return request<void>(`/api/tickets/${ticketId}/attachments/${attachmentId}`, { method: 'DELETE', accessToken });
}

export async function getTicketHistory(
  accessToken: string,
  ticketId: string,
): Promise<TicketStatusHistoryResponse[]> {
  return request<TicketStatusHistoryResponse[]>(`/api/tickets/${ticketId}/history`, { accessToken });
}
