import { NextResponse, type NextRequest } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  const redirectUrl = new URL('/login', request.url);
  const reason = request.nextUrl.searchParams.get('reason');

  if (reason) {
    redirectUrl.searchParams.set('reason', reason);
  }

  return NextResponse.redirect(redirectUrl);
}
