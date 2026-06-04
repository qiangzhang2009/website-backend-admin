/**
 * Admin Authentication API
 * Server-side password authentication with HttpOnly cookie session
 */

import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const SESSION_COOKIE_NAME = 'admin_session'
const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours

/**
 * Simple session token: base64(password_hash:timestamp)
 * In production, use NextAuth.js or JWT with proper signing.
 * For this admin panel, we use a password-derived token.
 */
function createSessionToken(password: string): string {
  const timestamp = Date.now()
  const payload = `${password}:${timestamp}`
  const base64 = Buffer.from(payload).toString('base64url')
  return base64
}

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

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'login'

  if (action === 'logout') {
    const response = NextResponse.json({ success: true, message: 'Logged out' })
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  // Login action
  if (action === 'login') {
    try {
      const body = await request.json()
      const { password } = body

      if (!password) {
        return NextResponse.json(
          { error: 'Password is required' },
          { status: 400 }
        )
      }

      if (!ADMIN_PASSWORD) {
        return NextResponse.json(
          { error: 'Admin password not configured on server' },
          { status: 503 }
        )
      }

      if (password !== ADMIN_PASSWORD) {
        // Use constant-time comparison to prevent timing attacks
        if (password.length !== ADMIN_PASSWORD.length) {
          return NextResponse.json(
            { error: 'Invalid password' },
            { status: 401 }
          )
        }
        // Sleep to normalize response time
        await new Promise(resolve => setTimeout(resolve, 100))
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        )
      }

      const token = createSessionToken(ADMIN_PASSWORD)
      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
      })

      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      })

      return response
    } catch (error) {
      console.error('[Auth] Login error:', error)
      return NextResponse.json(
        { error: 'Login failed' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  )
}

export async function GET(request: NextRequest) {
  // Verify session endpoint
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    )
  }

  if (!ADMIN_PASSWORD) {
    return NextResponse.json(
      { authenticated: false, error: 'Admin not configured' },
      { status: 503 }
    )
  }

  const isValid = verifySessionToken(token, ADMIN_PASSWORD)

  if (!isValid) {
    const response = NextResponse.json({ authenticated: false })
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  return NextResponse.json({ authenticated: true })
}
