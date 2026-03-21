/**
 * 最近事件 API
 * 返回实时访客活动
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 401 })
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    // 获取最近 20 条事件
    const rows = await sql`
      SELECT 
        visitor_id,
        event_type,
        page_url,
        created_at
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT 20
    `

    const events = rows.map((r: any) => ({
      visitorId: r.visitor_id,
      eventType: r.event_type,
      pageUrl: r.page_url,
      timestamp: r.created_at,
    }))

    return NextResponse.json(events)
  } catch (error) {
    console.error('Recent events API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
