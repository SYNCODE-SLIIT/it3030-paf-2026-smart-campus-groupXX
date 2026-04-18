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

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Continue clearing local auth cookies and redirecting even if upstream sign-out fails.
    }
  }

  const redirectUrl = new URL('/login', request.url);
  const reason = request.nextUrl.searchParams.get('reason');

  if (reason) {
    redirectUrl.searchParams.set('reason', reason);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  clearSupabaseCookies(response, request);

  return response;
}
