/**
 * Next.js Middleware — Admin Route Protection
 * Validates admin session cookie for all /api/admin/* routes
 * Runs at the Edge for maximum performance
 */

import { NextRequest, NextResponse } from 'next/server'

// Note: Edge Runtime cannot access NEXT_PUBLIC_ prefixed variables.
// We use ADMIN_PASSWORD (without prefix) which must be set in Vercel project settings.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const SESSION_COOKIE_NAME = 'admin_session'
const SESSION_MAX_AGE = 60 * 60 * 24

// Routes that don't require admin auth
const PUBLIC_PATHS = [
  '/api/admin/auth',      // Auth endpoints themselves
  '/api/tracking',        // Public tracking endpoint
  '/api/tracking-sdk',    // Public SDK endpoint
]

function verifySessionToken(token: string, password: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const [storedPassword, timestampStr] = decoded.split(':')
    const timestamp = parseInt(timestampStr, 10)
    if (storedPassword !== password) return false
    if (isNaN(timestamp)) return false
    const age = Date.now() - timestamp
    if (age > SESSION_MAX_AGE * 1000) return false
    return true
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Protect /api/admin/* routes (but not /api/admin/auth which is handled above)
  if (pathname.startsWith('/api/admin/')) {
    // If ADMIN_PASSWORD is not set, allow all requests (development mode)
    if (!ADMIN_PASSWORD) {
      return NextResponse.next()
    }

    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

    if (!token || !verifySessionToken(token, ADMIN_PASSWORD)) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/admin/:path*',
  ],
}
