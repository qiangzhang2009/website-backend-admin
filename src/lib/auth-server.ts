/**
 * Server-side Authentication Validation
 * Validates admin session cookies for all /api/admin/* routes
 */

import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const SESSION_COOKIE_NAME = 'admin_session'
const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours

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

/**
 * Require admin authentication
 * Returns 401 if not authenticated, or a NextResponse that should be returned immediately
 */
export function requireAdminAuth(request: NextRequest): NextResponse | null {
  if (!ADMIN_PASSWORD) {
    console.error('[Auth] NEXT_PUBLIC_ADMIN_PASSWORD not configured on server')
    return NextResponse.json(
      { error: 'Admin authentication not configured' },
      { status: 503 }
    )
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required. Please login at /admin' },
      { status: 401 }
    )
  }

  if (!verifySessionToken(token, ADMIN_PASSWORD)) {
    return NextResponse.json(
      { error: 'Session expired or invalid. Please login again.' },
      { status: 401 }
    )
  }

  return null // null = authenticated, proceed with handler
}

/**
 * Require admin auth AND tenant validation
 * Combines auth check with tenant check in one call
 */
export async function requireAdminAuthWithTenant(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  // Import here to avoid circular dependency
  const { getTenantId } = await import('@/lib/tenant')
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter' },
      { status: 401 }
    )
  }

  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) {
    return NextResponse.json(
      { error: `Tenant not found: ${tenantSlug}` },
      { status: 404 }
    )
  }

  return null // null = both auth and tenant valid, tenantId is available
}
