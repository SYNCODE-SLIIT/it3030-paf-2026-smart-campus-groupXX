import { NextRequest, NextResponse } from 'next/server';

import { getServerApiBaseUrl } from '@/lib/backend-url';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ typeId: string }> },
) {
  const base = getServerApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { message: 'Backend API base URL is not configured on the server.' },
      { status: 503 },
    );
  }

  const { typeId } = await context.params;
  const search = request.nextUrl.searchParams.toString();
  const query = search ? `?${search}` : '';

  const upstream = await fetch(`${base}/api/public/catalog/types/${encodeURIComponent(typeId)}/resources${query}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
}
