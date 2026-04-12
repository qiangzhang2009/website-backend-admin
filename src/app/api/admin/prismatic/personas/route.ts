/**
 * Prismatic Analytics - 人物热度 API
 * 从 Prismatic App 的内置 API 获取数据
 * GET /api/admin/prismatic/personas?tenant=prismatic&days=30
 */

import { NextRequest, NextResponse } from 'next/server'

const PRISMATIC_API_BASE = 'https://prismatic.zxqconsulting.com'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30', 10)
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  try {
    const res = await fetch(
      `${PRISMATIC_API_BASE}/api/analytics/personas?days=${days}&limit=${limit}`,
      { next: { revalidate: 30 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ personas: data.personas || [] })
  } catch (error) {
    console.error('Prismatic personas proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
