import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Origins allowed to call API routes (client app dev servers)
const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:19006',
]

function setCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  // Handle CORS preflight for API routes
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const response = new NextResponse(null, { status: 204 })
    return setCorsHeaders(response, origin)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Static PWA files — skip auth entirely
  if (
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/offline.html' ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/icon-')
  ) {
    return supabaseResponse
  }

  // Public routes that don't need auth
  if (
    pathname.startsWith('/checkin/') ||
    pathname.startsWith('/api/checkin') ||
    pathname.startsWith('/api/links/validate') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/api/push/') ||
    pathname.startsWith('/api/client/me') ||
    pathname.startsWith('/api/client/setup-coach') ||
    pathname.startsWith('/api/client/leaderboard') ||
    pathname.startsWith('/api/admin/') ||
    pathname.startsWith('/api/notifications/') ||
    pathname.startsWith('/book-consult')
  ) {
    return setCorsHeaders(supabaseResponse, origin)
  }

  // Auth routes: redirect to dashboard if already logged in
  if (pathname.startsWith('/login') || pathname.startsWith('/confirm')) {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Dashboard + admin + portal: require auth
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|offline\\.html|robots\\.txt|icon-.*\\.png|logo\\.png|.*\\.(?:svg|jpg|jpeg|gif|webp)$).*)',
  ],
}
