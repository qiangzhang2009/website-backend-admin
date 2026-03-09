/**
 * 流量趋势数据 API（最近 N 天）
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  // 租户验证
  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter. Please provide a valid tenant slug.' },
      { status: 401 }
    )
  }

  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const days = Math.min(Number(searchParams.get('days') ?? 7), 90)

    const since = new Date()
    since.setDate(since.getDate() - days)

    const rows = await sql`
      SELECT
        DATE(created_at AT TIME ZONE 'Asia/Shanghai') AS date,
        COUNT(*) AS page_views,
        COUNT(DISTINCT visitor_id) AS visitors
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND event_type = 'page_view'
        AND created_at >= ${since.toISOString()}
      GROUP BY date
      ORDER BY date ASC
    `

    return NextResponse.json(rows.map(r => ({
      date: String(r.date),
      visitors: Number(r.visitors),
      pageViews: Number(r.page_views),
    })))
  } catch (error) {
    console.error('Traffic API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
