import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getSupabasePublicEnv } from '@/lib/supabase/env';

const SESSION_REFRESH_PREFIXES = [
  '/account',
  '/admin',
  '/auth',
  '/booking-managers',
  '/catalog-managers',
  '/faculty',
  '/managers',
  '/portal',
  '/student',
  '/students',
  '/ticket-managers',
];

function needsSessionRefresh(pathname: string) {
  return SESSION_REFRESH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function updateSession(request: NextRequest) {
  const env = getSupabasePublicEnv();

  if (!needsSessionRefresh(request.nextUrl.pathname)) {
    return NextResponse.next({
      request,
    });
  }

  if (!env) {
    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // Keep routing responsive even when session refresh fails; server guards handle auth redirects.
  }

  return response;
}
