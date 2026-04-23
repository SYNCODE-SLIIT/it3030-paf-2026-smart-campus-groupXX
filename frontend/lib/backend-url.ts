function normalizeBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function getPublicApiBaseUrl() {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL)
    ?? (process.env.NODE_ENV === 'production' ? null : 'http://localhost:8080');
}

function isInternalApiUrlEnabled() {
  return process.env.USE_INTERNAL_API_URL?.trim().toLowerCase() === 'true';
}

export function getBrowserApiBaseUrl() {
  return getPublicApiBaseUrl();
}

export function getServerApiBaseUrl() {
  if (isInternalApiUrlEnabled()) {
    return normalizeBaseUrl(process.env.INTERNAL_API_URL)
      ?? getPublicApiBaseUrl();
  }

  return getPublicApiBaseUrl();
}

export function requireApiBaseUrl() {
  const apiBaseUrl = typeof window === 'undefined'
    ? getServerApiBaseUrl()
    : getBrowserApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error('Backend API base URL is not configured.');
  }

  return apiBaseUrl;
}
