/**
 * 实时在线用户 API
 * 返回过去 5 分钟内有活动的用户数，以及今日工具使用数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 401 })
  }

  // 数据库未配置
  if (!isDbConfigured || !sql) {
    return NextResponse.json({
      online: 0,
      peak: 0,
      pages: [],
      todayTools: 0,
      error: 'Database not configured'
    })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) {
      return NextResponse.json({ online: 0, peak: 0, pages: [], todayTools: 0 })
    }

    // 计算时间范围 - 过去5分钟
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStartStr = todayStart.toISOString()

    // 查询当前在线用户数（过去5分钟有活动的）
    const onlineResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as online
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${fiveMinAgo}
    `
    const online = Number(onlineResult[0]?.online ?? 0)

    // 查询今日峰值（每小时统计）
    const peakResult = await sql`
      SELECT MAX(hourly_count) as peak
      FROM (
        SELECT DATE_TRUNC('hour', created_at) as hour, COUNT(DISTINCT visitor_id) as hourly_count
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${todayStartStr}
        GROUP BY DATE_TRUNC('hour', created_at)
      ) t
    `
    const peak = Number(peakResult[0]?.peak ?? 0)

    // 查询当前在线用户的页面分布
    const pagesResult = await sql`
      SELECT 
        page_url,
        COUNT(DISTINCT visitor_id) as users
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${fiveMinAgo}
      GROUP BY page_url
      ORDER BY users DESC
      LIMIT 10
    `
    const pages = pagesResult.map((row: any) => ({
      page: row.page_url,
      users: Number(row.users)
    }))

    // 查询今日工具使用次数
    const todayToolsResult = await sql`
      SELECT COUNT(*) as count
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${todayStartStr}
    `
    const todayTools = Number(todayToolsResult[0]?.count ?? 0)

    return NextResponse.json({
      online,
      peak: Math.max(peak, online),
      pages,
      todayTools,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Real-time API error:', error)
    return NextResponse.json({ 
      online: 0, 
      peak: 0, 
      pages: [],
      todayTools: 0,
      error: String(error) 
    }, { status: 500 })
  }
}
