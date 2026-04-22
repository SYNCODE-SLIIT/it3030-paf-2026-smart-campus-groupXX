'use client';

import React from 'react';

const AUTH_HASH_KEYS = new Set([
  'access_token',
  'refresh_token',
  'token_hash',
  'type',
  'error',
  'error_code',
  'error_description',
]);

function hasAuthHash(hashParams: URLSearchParams) {
  for (const key of AUTH_HASH_KEYS) {
    if (hashParams.has(key)) {
      return true;
    }
  }

  return false;
}

export function AuthHashRedirector() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const { pathname, search, hash } = window.location;
    if (pathname === '/auth/callback' || !hash) return;

    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    if (!hasAuthHash(hashParams)) return;

    const searchParams = new URLSearchParams(search);
    if (!searchParams.has('flow') && hashParams.has('error')) {
      searchParams.set('flow', 'invite');
    }

    const query = searchParams.toString();
    window.location.replace(`/auth/callback${query ? `?${query}` : ''}${hash}`);
  }, []);

  return null;
}
