/**
 * 自动化报告 API
 * 生成日报、周报、月报数据
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

type ReportPeriod = 'daily' | 'weekly' | 'monthly'

function getDateRange(period: ReportPeriod): { start: Date; end: Date; label: string } {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000 + 8 * 3600000
  const local = new Date(now.getTime() + offset)
  local.setHours(0, 0, 0, 0)

  switch (period) {
    case 'daily': {
      const start = new Date(local)
      const end = new Date(local)
      end.setDate(end.getDate() + 1)
      return { start, end, label: '日报' }
    }
    case 'weekly': {
      const start = new Date(local)
      start.setDate(start.getDate() - 6)
      const end = new Date(local)
      end.setDate(end.getDate() + 1)
      return { start, end, label: '周报' }
    }
    case 'monthly': {
      const start = new Date(local)
      start.setDate(1)
      const end = new Date(local)
      end.setDate(end.getDate() + 1)
      return { start, end, label: '月报' }
    }
  }
}

function getComparisonRange(period: ReportPeriod): { start: Date; end: Date } {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000 + 8 * 3600000
  const local = new Date(now.getTime() + offset)
  local.setHours(0, 0, 0, 0)

  switch (period) {
    case 'daily': {
      const start = new Date(local)
      start.setDate(start.getDate() - 1)
      const end = new Date(local)
      return { start, end }
    }
    case 'weekly': {
      const start = new Date(local)
      start.setDate(start.getDate() - 13)
      const end = new Date(local)
      end.setDate(end.getDate() - 6)
      return { start, end }
    }
    case 'monthly': {
      const start = new Date(local)
      start.setMonth(start.getMonth() - 1)
      start.setDate(1)
      const end = new Date(local)
      end.setDate(0)
      return { start, end }
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')
  const period = (searchParams.get('period') || 'daily') as ReportPeriod

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 401 })
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const range = getDateRange(period)
    const comp = getComparisonRange(period)

    const startStr = range.start.toISOString()
    const endStr = range.end.toISOString()
    const compStartStr = comp.start.toISOString()
    const compEndStr = comp.end.toISOString()

    // ==========================================
    // 1. 当前周期核心指标
    // ==========================================
    const currentMetrics = await sql`
      SELECT 
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(*) AS page_views,
        COUNT(DISTINCT session_id) AS sessions,
        COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN visitor_id END) AS active_visitors
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startStr}
        AND created_at < ${endStr}
    `

    const currentToolUsage = await sql`
      SELECT COUNT(DISTINCT visitor_id) AS tool_users, COUNT(*) AS tool_interactions
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startStr}
        AND created_at < ${endStr}
    `

    const currentInquiries = await sql`
      SELECT COUNT(*) AS inquiries
      FROM public.inquiries
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startStr}
        AND created_at < ${endStr}
    `

    const cv = currentMetrics[0]
    const tv = currentToolUsage[0]
    const iv = currentInquiries[0]

    const visitors = Number(cv?.visitors ?? 0)
    const pageViews = Number(cv?.page_views ?? 0)
    const sessions = Number(cv?.sessions ?? 0)
    const activeVisitors = Number(cv?.active_visitors ?? 0)
    const toolUsers = Number(tv?.tool_users ?? 0)
    const toolInteractions = Number(tv?.tool_interactions ?? 0)
    const inquiries = Number(iv?.inquiries ?? 0)

    const engagementRate = visitors > 0 ? Math.round((activeVisitors / visitors) * 10000) / 100 : 0
    const toolUsageRate = visitors > 0 ? Math.round((toolUsers / visitors) * 10000) / 100 : 0
    const conversionRate = visitors > 0 ? Math.round((inquiries / visitors) * 10000) / 100 : 0

    // ==========================================
    // 2. 上一周期对比指标
    // ==========================================
    const prevMetrics = await sql`
      SELECT 
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(*) AS page_views
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${compStartStr}
        AND created_at < ${compEndStr}
    `

    const prevInquiryRows = await sql`
      SELECT COUNT(*) AS inquiries
      FROM public.inquiries
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${compStartStr}
        AND created_at < ${compEndStr}
    `

    const pm = prevMetrics[0]
    const pi = prevInquiryRows[0]
    const prevVisitors = Number(pm?.visitors ?? 0)
    const prevPageViews = Number(pm?.page_views ?? 0)
    const prevInquiryCount = Number(pi?.inquiries ?? 0)

    // ==========================================
    // 3. 每日趋势数据
    // ==========================================
    const daysCount = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24))

    const dailyTrend = await sql`
      SELECT 
        TO_CHAR(DATE(created_at AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD') AS date,
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(*) AS page_views,
        COUNT(DISTINCT session_id) AS sessions
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startStr}
        AND created_at < ${endStr}
        AND event_type = 'page_view'
      GROUP BY TO_CHAR(DATE(created_at AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD')
      ORDER BY date ASC
    `

    const dailyInquiries = await sql`
      SELECT 
        TO_CHAR(DATE(created_at AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD') AS date,
        COUNT(*) AS inquiries
      FROM public.inquiries
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startStr}
        AND created_at < ${endStr}
      GROUP BY TO_CHAR(DATE(created_at AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD')
    `

    const inquiryMap = new Map<string, number>()
    dailyInquiries.forEach((row: any) => inquiryMap.set(String(row.date), Number(row.inquiries)))

    const dailyTrendData = dailyTrend.map((row: any) => ({
      date: String(row.date),
      visitors: Number(row.visitors),
      pageViews: Number(row.page_views),
      sessions: Number(row.sessions),
      inquiries: inquiryMap.get(String(row.date)) || 0,
    }))

    // ==========================================
    // 4. Top 页面
    // ==========================================
    const topPages = await sql`
      SELECT 
        page_url,
        COUNT(*) AS views,
        COUNT(DISTINCT visitor_id) AS unique_visitors
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startStr}
        AND created_at < ${endStr}
        AND event_type = 'page_view'
        AND page_url IS NOT NULL
      GROUP BY page_url
      ORDER BY views DESC
      LIMIT 10
    `

    const topPagesData = topPages.map((row: any) => ({
      page: row.page_url,
      views: Number(row.views),
      uniqueVisitors: Number(row.unique_visitors),
    }))

    // ==========================================
    // 5. Top 来源
    // ==========================================
    const topSources = await sql`
      SELECT 
        COALESCE(traffic_source, '直接访问') AS source,
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(*) AS page_views
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startStr}
        AND created_at < ${endStr}
      GROUP BY traffic_source
      ORDER BY visitors DESC
      LIMIT 8
    `

    const topSourcesData = topSources.map((row: any) => ({
      source: row.source || '直接访问',
      visitors: Number(row.visitors),
      pageViews: Number(row.page_views),
    }))

    // ==========================================
    // 6. 工具使用排行
    // ==========================================
    const topTools = await sql`
      SELECT 
        tool_name,
        COUNT(*) AS total,
        COUNT(CASE WHEN action IN ('complete', 'submit') THEN 1 END) AS completed
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startStr}
        AND created_at < ${endStr}
      GROUP BY tool_name
      ORDER BY total DESC
      LIMIT 5
    `

    const topToolsData = topTools.map((row: any) => ({
      tool: row.tool_name,
      total: Number(row.total),
      completed: Number(row.completed),
      completionRate: Number(row.total) > 0
        ? Math.round((Number(row.completed) / Number(row.total)) * 100)
        : 0,
    }))

    // ==========================================
    // 7. 地域分布
    // ==========================================
    const geoDistribution = await sql`
      SELECT 
        COALESCE(country, 'Unknown') AS country,
        COUNT(DISTINCT visitor_id) AS visitors
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startStr}
        AND created_at < ${endStr}
      GROUP BY country
      ORDER BY visitors DESC
      LIMIT 5
    `

    const geoData = geoDistribution.map((row: any) => ({
      country: row.country || 'Unknown',
      visitors: Number(row.visitors),
    }))

    // ==========================================
    // 8. 汇总与环比
    // ==========================================
    const calcChange = (current: number, previous: number): number => {
      if (previous === 0) return 0
      return Math.round(((current - previous) / previous) * 10000) / 100
    }

    const summary = {
      visitors,
      pageViews,
      sessions,
      activeVisitors,
      toolUsers,
      toolInteractions,
      inquiries,
      engagementRate,
      toolUsageRate,
      conversionRate,
    }

    const comparison = {
      visitorsChange: calcChange(visitors, prevVisitors),
      pageViewsChange: calcChange(pageViews, prevPageViews),
      inquiriesChange: calcChange(inquiries, prevInquiryCount),
    }

    return NextResponse.json({
      period: range.label,
      periodLabel: range.label,
      dateRange: {
        start: range.start.toISOString().split('T')[0],
        end: range.end.toISOString().split('T')[0],
      },
      summary,
      comparison,
      dailyTrend: dailyTrendData,
      topPages: topPagesData,
      topSources: topSourcesData,
      topTools: topToolsData,
      geoDistribution: geoData,
    })
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
