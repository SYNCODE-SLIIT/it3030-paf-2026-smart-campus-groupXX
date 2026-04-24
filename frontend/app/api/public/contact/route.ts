import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getServerApiBaseUrl } from '@/lib/backend-url';

export async function POST(request: NextRequest) {
  const base = getServerApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { message: 'Backend API base URL is not configured on the server.' },
      { status: 503 },
    );
  }

  const body = await request.text();
  const upstream = await fetch(`${base}/api/public/contact`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
    },
    body,
    cache: 'no-store',
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
