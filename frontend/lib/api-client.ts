import {
  AccountStatus,
  type CreateUserRequest,
  type ErrorResponse,
  type ManagerRole,
  type ManagerRolesUpdateRequest,
  type MessageResponse,
  type SessionSyncResponse,
  type StudentOnboardingRequest,
  type StudentOnboardingStateResponse,
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
}

const RETRYABLE_UPSTREAM_STATUSES = new Set([502, 503, 504]);

function shouldRetryRequest(response: Response, options: RequestOptions, attempt: number) {
  const method = options.method ?? 'GET';
  return method === 'GET' && attempt < 1 && RETRYABLE_UPSTREAM_STATUSES.has(response.status);
}

function shouldRetryNetworkError(options: RequestOptions, attempt: number) {
  const method = options.method ?? 'GET';
  return method === 'GET' && attempt < 1;
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
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
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

export async function replaceManagerRoles(
  accessToken: string,
  userId: string,
  payload: ManagerRolesUpdateRequest,
) {
  return request<UserResponse>(`/api/admin/users/${userId}/manager-roles`, {
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
