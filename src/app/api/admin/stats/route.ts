/**
 * 仪表盘统计数据 API
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'zxqconsulting'

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    // 租户 ID
    const tenantRows = await sql`SELECT id FROM public.tenants WHERE slug = ${tenantSlug} LIMIT 1`
    const tenantId = tenantRows[0]?.id
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)
    const prevWeek = new Date(today)
    prevWeek.setDate(prevWeek.getDate() - 14)

    const [
      todayVisitors,
      yesterdayVisitors,
      totalUsers,
      lastWeekUsers,
      totalInquiries,
      lastWeekInquiries,
      completedInquiries,
    ] = await Promise.all([
      sql`SELECT COUNT(DISTINCT visitor_id) AS cnt FROM public.tracking_events WHERE tenant_id=${tenantId} AND created_at >= ${today.toISOString()}`,
      sql`SELECT COUNT(DISTINCT visitor_id) AS cnt FROM public.tracking_events WHERE tenant_id=${tenantId} AND created_at >= ${yesterday.toISOString()} AND created_at < ${today.toISOString()}`,
      sql`SELECT COUNT(*) AS cnt FROM public.users WHERE tenant_id=${tenantId}`,
      sql`SELECT COUNT(*) AS cnt FROM public.users WHERE tenant_id=${tenantId} AND created_at < ${lastWeek.toISOString()}`,
      sql`SELECT COUNT(*) AS cnt FROM public.inquiries WHERE tenant_id=${tenantId}`,
      sql`SELECT COUNT(*) AS cnt FROM public.inquiries WHERE tenant_id=${tenantId} AND created_at < ${lastWeek.toISOString()}`,
      sql`SELECT COUNT(*) AS cnt FROM public.inquiries WHERE tenant_id=${tenantId} AND status='completed'`,
    ])

    const tv = Number(todayVisitors[0]?.cnt ?? 0)
    const yv = Number(yesterdayVisitors[0]?.cnt ?? 0)
    const tu = Number(totalUsers[0]?.cnt ?? 0)
    const lwu = Number(lastWeekUsers[0]?.cnt ?? 0)
    const ti = Number(totalInquiries[0]?.cnt ?? 0)
    const lwi = Number(lastWeekInquiries[0]?.cnt ?? 0)
    const ci = Number(completedInquiries[0]?.cnt ?? 0)

    const conversionRate = tu > 0 ? ((ti / tu) * 100) : 0
    const pct = (curr: number, prev: number) =>
      prev > 0 ? Number((((curr - prev) / prev) * 100).toFixed(1)) : 0

    return NextResponse.json({
      todayVisitors: tv,
      todayVisitorsChange: pct(tv, yv),
      totalUsers: tu,
      totalUsersChange: pct(tu, lwu),
      inquiries: ti,
      inquiriesChange: pct(ti, lwi),
      conversionRate: Number(conversionRate.toFixed(2)),
      completedInquiries: ci,
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
