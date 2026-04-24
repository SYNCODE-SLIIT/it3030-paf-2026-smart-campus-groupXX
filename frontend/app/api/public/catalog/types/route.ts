import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getServerApiBaseUrl } from '@/lib/backend-url';

/**
 * Proxies the public catalogue to the Spring Boot API using the server-side base URL
 * (e.g. INTERNAL_API_URL in Docker). The browser calls this same-origin route on :3000
 * so it does not need the backend listening on the host’s :8080.
 */
export async function GET(request: NextRequest) {
  const base = getServerApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { message: 'Backend API base URL is not configured on the server.' },
      { status: 503 },
    );
  }

  const query = request.nextUrl.searchParams.toString();
  const suffix = query ? `?${query}` : '';

  const upstream = await fetch(`${base}/api/public/catalog/types${suffix}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
