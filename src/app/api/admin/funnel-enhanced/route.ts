/**
 * 转化漏斗分析 API - 增强版
 * 提供完整的用户转化路径分析
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')
  const days = Number(searchParams.get('days') ?? 30)

  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter' },
      { status: 401 }
    )
  }

  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    // 计算日期范围
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // ==========================================
    // 1. 基础漏斗分析
    // ==========================================
    
    // 访客数 (有 tracking_events 的独立访客)
    const visitorsResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${startDate}
    `
    const visitors = Number(visitorsResult[0]?.count ?? 0)

    // 浏览页面数 > 3 的访客
    const engagedResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${startDate}
      AND event_type = 'page_view'
      GROUP BY visitor_id
      HAVING COUNT(*) > 3
    `
    const engagedVisitors = engagedResult.length

    // 使用工具的访客
    const toolUsersResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${startDate}
    `
    const toolUsers = Number(toolUsersResult[0]?.count ?? 0)

    // 完成工具使用的访客
    const completedUsersResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${startDate}
      AND action IN ('complete', 'submit')
    `
    const completedUsers = Number(completedUsersResult[0]?.count ?? 0)

    // 提交询盘的访客
    const inquiryUsersResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM public.inquiries
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${startDate}
    `
    const inquiryUsers = Number(inquiryUsersResult[0]?.count ?? 0)

    // ==========================================
    // 2. 转化漏斗数据
    // ==========================================
    
    const funnelData = [
      { stage: '访客', count: visitors, rate: 100 },
      { stage: '活跃访客(>3页面)', count: engagedVisitors, rate: visitors > 0 ? Math.round((engagedVisitors / visitors) * 100) : 0 },
      { stage: '工具使用者', count: toolUsers, rate: visitors > 0 ? Math.round((toolUsers / visitors) * 100) : 0 },
      { stage: '完成分析', count: completedUsers, rate: toolUsers > 0 ? Math.round((completedUsers / toolUsers) * 100) : 0 },
      { stage: '提交询盘', count: inquiryUsers, rate: completedUsers > 0 ? Math.round((inquiryUsers / completedUsers) * 100) : 0 },
    ]

    // ==========================================
    // 3. 转化率趋势 (按天)
    // ==========================================
    
    const trendResult = await sql`
      SELECT 
        DATE(te.created_at) as date,
        COUNT(DISTINCT te.visitor_id) as visitors,
        COUNT(DISTINCT CASE WHEN te.event_type = 'page_view' THEN te.visitor_id END) as page_viewers,
        COUNT(DISTINCT ti.visitor_id) as tool_users,
        COUNT(DISTINCT CASE WHEN ti.action IN ('complete', 'submit') THEN ti.visitor_id END) as completions,
        COUNT(DISTINCT i.visitor_id) as inquirers
      FROM public.tracking_events te
      LEFT JOIN public.tool_interactions ti 
        ON ti.tenant_id = te.tenant_id 
        AND ti.visitor_id = te.visitor_id 
        AND ti.created_at >= ${startDate}
      LEFT JOIN public.inquiries i 
        ON i.tenant_id = te.tenant_id 
        AND i.visitor_id = te.visitor_id 
        AND i.created_at >= ${startDate}
      WHERE te.tenant_id = ${tenantId}
      AND te.created_at >= ${startDate}
      GROUP BY DATE(te.created_at)
      ORDER BY date DESC
      LIMIT ${days}
    `

    const trend = trendResult.map(row => ({
      date: row.date,
      visitors: Number(row.visitors),
      pageViewers: Number(row.page_viewers),
      toolUsers: Number(row.tool_users),
      completions: Number(row.completions),
      inquirers: Number(row.inquirers),
      conversionRate: Number(row.visitors) > 0 
        ? Math.round((Number(row.inquirers) / Number(row.visitors)) * 10000) / 100 
        : 0,
    }))

    // ==========================================
    // 4. 页面转化分析
    // ==========================================
    
    const pageFunnelResult = await sql`
      SELECT 
        te.page_url,
        COUNT(DISTINCT te.visitor_id) as visitors,
        COUNT(*) as views,
        COUNT(DISTINCT ti.visitor_id) as converted
      FROM public.tracking_events te
      LEFT JOIN public.tool_interactions ti
        ON ti.tenant_id = te.tenant_id
        AND ti.visitor_id = te.visitor_id
        AND ti.created_at >= ${startDate}
      WHERE te.tenant_id = ${tenantId}
      AND te.created_at >= ${startDate}
      AND te.event_type = 'page_view'
      GROUP BY te.page_url
      HAVING COUNT(DISTINCT te.visitor_id) >= 5
      ORDER BY visitors DESC
      LIMIT 10
    `

    const pageFunnel = pageFunnelResult.map(row => ({
      page: row.page_url,
      visitors: Number(row.visitors),
      views: Number(row.views),
      converted: Number(row.converted),
      conversionRate: Number(row.visitors) > 0 
        ? Math.round((Number(row.converted) / Number(row.visitors)) * 10000) / 100 
        : 0,
    }))

    // ==========================================
    // 5. 工具转化分析
    // ==========================================
    
    const toolFunnelResult = await sql`
      SELECT 
        tool_name,
        COUNT(*) as total,
        COUNT(CASE WHEN action = 'start' THEN 1 END) as started,
        COUNT(CASE WHEN action IN ('complete', 'submit') THEN 1 END) as completed,
        COUNT(CASE WHEN action = 'abandon' THEN 1 END) as abandoned,
        AVG(CASE WHEN duration_ms > 0 THEN duration_ms END) as avg_duration_ms
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${startDate}
      GROUP BY tool_name
      ORDER BY total DESC
    `

    const toolFunnel = toolFunnelResult.map(row => ({
      tool: row.tool_name,
      total: Number(row.total),
      started: Number(row.started),
      completed: Number(row.completed),
      abandoned: Number(row.abandoned),
      completionRate: Number(row.started) > 0 
        ? Math.round((Number(row.completed) / Number(row.started)) * 10000) / 100 
        : 0,
      avgDuration: row.avg_duration_ms ? Math.round(Number(row.avg_duration_ms) / 1000) : 0,
    }))

    // ==========================================
    // 6. 来源转化分析
    // ==========================================
    
    const sourceFunnelResult = await sql`
      SELECT 
        te.traffic_source,
        COUNT(DISTINCT te.visitor_id) as visitors,
        COUNT(DISTINCT ti.visitor_id) as tool_users,
        COUNT(DISTINCT i.visitor_id) as inquirers
      FROM public.tracking_events te
      LEFT JOIN public.tool_interactions ti
        ON ti.tenant_id = te.tenant_id
        AND ti.visitor_id = te.visitor_id
        AND ti.created_at >= ${startDate}
      LEFT JOIN public.inquiries i
        ON i.tenant_id = te.tenant_id
        AND i.visitor_id = te.visitor_id
        AND i.created_at >= ${startDate}
      WHERE te.tenant_id = ${tenantId}
      AND te.created_at >= ${startDate}
      AND te.traffic_source IS NOT NULL
      GROUP BY te.traffic_source
      ORDER BY visitors DESC
    `

    const sourceFunnel = sourceFunnelResult.map(row => ({
      source: row.traffic_source,
      visitors: Number(row.visitors),
      toolUsers: Number(row.tool_users),
      inquirers: Number(row.inquirers),
      toolConversion: Number(row.visitors) > 0 
        ? Math.round((Number(row.tool_users) / Number(row.visitors)) * 10000) / 100 
        : 0,
      inquiryConversion: Number(row.visitors) > 0 
        ? Math.round((Number(row.inquirers) / Number(row.visitors)) * 10000) / 100 
        : 0,
    }))

    // ==========================================
    // 7. 汇总统计
    // ==========================================
    
    const summary = {
      totalVisitors: visitors,
      totalEngaged: engagedVisitors,
      totalToolUsers: toolUsers,
      totalCompletions: completedUsers,
      totalInquiries: inquiryUsers,
      overallConversionRate: visitors > 0 
        ? Math.round((inquiryUsers / visitors) * 10000) / 100 
        : 0,
      avgTimeToConvert: null, // 需要更复杂的查询计算
    }

    return NextResponse.json({
      funnel: funnelData,
      trend,
      pageFunnel,
      toolFunnel,
      sourceFunnel,
      summary,
      period: days,
    })
  } catch (error) {
    console.error('Funnel API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
