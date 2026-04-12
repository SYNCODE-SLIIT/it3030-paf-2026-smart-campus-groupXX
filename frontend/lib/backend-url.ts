function normalizeBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function getServerApiBaseUrl() {
  return normalizeBaseUrl(process.env.INTERNAL_API_URL) ?? normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}

export function requireServerApiBaseUrl() {
  const apiBaseUrl = getServerApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error('Backend API base URL is not configured.');
  }

  return apiBaseUrl;
}
