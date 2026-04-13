import type { NextRequest } from 'next/server';

import { requireServerApiBaseUrl } from '@/lib/backend-url';

const REQUEST_HEADERS_TO_FORWARD = new Set([
  'accept',
  'authorization',
  'content-type',
]);

const RESPONSE_HEADERS_TO_FORWARD = [
  'cache-control',
  'content-language',
  'content-type',
  'expires',
  'last-modified',
  'location',
  'pragma',
  'vary',
  'www-authenticate',
] as const;

function buildTargetUrl(request: NextRequest) {
  return `${requireServerApiBaseUrl()}${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function copyRequestHeaders(headers: Headers) {
  const nextHeaders = new Headers();

  for (const [key, value] of headers.entries()) {
    if (REQUEST_HEADERS_TO_FORWARD.has(key.toLowerCase())) {
      nextHeaders.set(key, value);
    }
  }

  return nextHeaders;
}

function copyResponseHeaders(headers: Headers) {
  const nextHeaders = new Headers();

  for (const key of RESPONSE_HEADERS_TO_FORWARD) {
    const value = headers.get(key);

    if (value) {
      nextHeaders.set(key, value);
    }
  }

  return nextHeaders;
}

async function forward(request: NextRequest) {
  const init: RequestInit = {
    method: request.method,
    headers: copyRequestHeaders(request.headers),
    cache: 'no-store',
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  try {
    const response = await fetch(buildTargetUrl(request), init);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: copyResponseHeaders(response.headers),
    });
  } catch {
    return Response.json(
      {
        timestamp: new Date().toISOString(),
        status: 502,
        error: 'Bad Gateway',
        message: 'Cannot reach the backend API from the Next.js server.',
        path: request.nextUrl.pathname,
      },
      { status: 502 },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;
export const HEAD = forward;
