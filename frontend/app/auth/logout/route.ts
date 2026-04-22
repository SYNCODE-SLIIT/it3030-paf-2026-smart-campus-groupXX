import { NextResponse, type NextRequest } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

function clearSupabaseCookies(response: NextResponse, request: NextRequest) {
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith('sb-')) {
      continue;
    }

    response.cookies.set(cookie.name, '', {
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    });
  }
}

function sanitizeInternalNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return null;
  }

  try {
    const parsed = new URL(nextPath, 'http://localhost');
    if (parsed.origin !== 'http://localhost') {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Continue clearing local auth cookies and redirecting even if upstream sign-out fails.
    }
  }

  const nextPath = sanitizeInternalNextPath(request.nextUrl.searchParams.get('next'));
  const redirectUrl = nextPath ? new URL(nextPath, request.url) : new URL('/login', request.url);
  const reason = request.nextUrl.searchParams.get('reason');

  if (!nextPath && reason) {
    redirectUrl.searchParams.set('reason', reason);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  clearSupabaseCookies(response, request);

  return response;
}
