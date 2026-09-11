import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 1. Request Correlation ID generation and propagation
  const existingCorrelationId = request.headers.get('x-correlation-id');
  const correlationId = existingCorrelationId || crypto.randomUUID();
  response.headers.set('x-correlation-id', correlationId);

  // 2. Supabase Auth Session Refreshing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 3. Platform Super Admin Route Guards (/platform/*)
  if (pathname.startsWith('/platform')) {
    if (!user) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
      p_user_id: user.id,
    });

    if (!isSuperAdmin) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', 'Unauthorized');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 4. Restaurant Admin & Staff Dashboard Route Guards (/dashboard/*)
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    const { data: memberships } = await supabase
      .from('restaurant_memberships')
      .select('role, status')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE');

    const isRestaurantAdmin = memberships?.some((m) => m.role === 'RESTAURANT_ADMIN');
    const isStaff = memberships?.some((m) => m.role === 'STAFF');

    if (!isRestaurantAdmin && !isStaff) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', 'Unauthorized');
      return NextResponse.redirect(redirectUrl);
    }

    // Staff cannot access admin management routes (/dashboard, /dashboard/profile, /dashboard/staff)
    if (isStaff && !isRestaurantAdmin && !pathname.startsWith('/dashboard/operational')) {
      return NextResponse.redirect(new URL('/dashboard/operational', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
