/**
 * Prismatic Analytics - 总览 API
 * 从 Prismatic App 的内置 API 获取数据
 * GET /api/admin/prismatic/overview?tenant=prismatic&days=7
 */

import { NextRequest, NextResponse } from 'next/server'

const PRISMATIC_API_BASE = 'https://prismatic.zxqconsulting.com'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7', 10)

  try {
    const res = await fetch(`${PRISMATIC_API_BASE}/api/analytics/overview?days=${days}`, {
      // Note: Vercel serverless fetch does not support `next: { revalidate }`
      // The parent API route itself is edge-cached by Vercel if configured
    })

    if (!res.ok) {
      console.error('Failed to fetch from Prismatic API:', res.status)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Prismatic overview proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
