/**
 * 实时数据大屏 API
 * 提供实时访客、转化等核心指标
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export const runtime = 'edge'

// 国家名称标准化映射
const COUNTRY_MAPPING: Record<string, string> = {
  '中国': '中国', 'china': '中国', 'CN': '中国', 'cn': '中国',
  '日本': '日本', 'japan': '日本', 'JP': '日本', 'jp': '日本',
  '美国': '美国', 'usa': '美国', 'US': '美国', 'us': '美国', 'united states': '美国',
  '英国': '英国', 'uk': '英国', 'UK': '英国', 'united kingdom': '英国',
  '德国': '德国', '德國': '德国', 'germany': '德国', 'DE': '德国', 'de': '德国',
  '法国': '法国', 'france': '法国', 'FR': '法国', 'fr': '法国',
  '韩国': '韩国', 'korea': '韩国', 'KR': '韩国', 'kr': '韩国',
  '台湾': '台湾', 'taiwan': '台湾', 'TW': '台湾', 'tw': '台湾',
  '香港': '香港', 'hong kong': '香港', 'HK': '香港', 'hk': '香港',
  '新加坡': '新加坡', 'singapore': '新加坡', 'SG': '新加坡', 'sg': '新加坡',
  '加拿大': '加拿大', 'canada': '加拿大', 'CA': '加拿大', 'ca': '加拿大',
  '澳大利亚': '澳大利亚', 'australia': '澳大利亚', 'AU': '澳大利亚', 'au': '澳大利亚',
}

// 标准化国家名称（支持分号分隔的多国家名）
function normalizeCountry(country: string | null | undefined): string {
  if (!country) return ''
  if (country.includes(';')) {
    return country.split(';').map(normalizeCountry).join(';')
  }
  const normalized = country.toString().toLowerCase().trim()
  return COUNTRY_MAPPING[normalized] || COUNTRY_MAPPING[country] || country
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 401 })
  }

  if (!isDbConfigured || !sql) {
    return NextResponse.json({ 
      realtime: null, 
      summary: { error: 'Database not configured' } 
    })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) {
      return NextResponse.json({ realtime: null, summary: {} })
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // ==================== 实时数据 ====================
    
    // 今日访客 (按天)
    const todayVisitorsResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${today.toISOString()}
    `
    const todayVisitors = Number(todayVisitorsResult[0]?.count || 0)

    // 今日页面浏览
    const todayPageViewsResult = await sql`
      SELECT COUNT(*) as count
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
      AND event_type = 'page_view'
      AND created_at >= ${today.toISOString()}
    `
    const todayPageViews = Number(todayPageViewsResult[0]?.count || 0)

    // 今日工具使用
    const todayToolsResult = await sql`
      SELECT COUNT(*) as count
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${today.toISOString()}
    `
    const todayTools = Number(todayToolsResult[0]?.count || 0)

    // 今日询盘
    const todayInquiriesResult = await sql`
      SELECT COUNT(*) as count
      FROM public.inquiries
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${today.toISOString()}
    `
    const todayInquiries = Number(todayInquiriesResult[0]?.count || 0)

    // ==================== 24小时数据 ====================
    
    const visitors24hResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${last24h.toISOString()}
    `
    const visitors24h = Number(visitors24hResult[0]?.count || 0)

    // ==================== 7天数据 ====================
    
    const visitors7dResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${last7d.toISOString()}
    `
    const visitors7d = Number(visitors7dResult[0]?.count || 0)

    // 7天趋势 (按天)
    const trend7dResult = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT visitor_id) as visitors,
        COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_views
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${last7d.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `
    const trend7d = trend7dResult.map(r => ({
      date: r.date,
      visitors: Number(r.visitors),
      pageViews: Number(r.page_views),
    }))

    // ==================== 30天数据 ====================
    
    const visitors30dResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${last30d.toISOString()}
    `
    const visitors30d = Number(visitors30dResult[0]?.count || 0)

    // ==================== 转化数据 ====================
    
    // 活跃访客 (>3 页面)
    const engagedResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${today.toISOString()}
      AND event_type = 'page_view'
      GROUP BY visitor_id
      HAVING COUNT(*) > 3
    `
    const todayEngaged = engagedResult.length

    // 工具使用者
    const toolUsersResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${today.toISOString()}
    `
    const todayToolUsers = Number(toolUsersResult[0]?.count || 0)

    // ==================== 实时访客 (最近30分钟) ====================
    
    const last30min = new Date(now.getTime() - 30 * 60 * 1000)
    const activeVisitorsResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
      AND created_at >= ${last30min.toISOString()}
    `
    const activeVisitors = Number(activeVisitorsResult[0]?.count || 0)

    // 最近的活动
    const recentEventsResult = await sql`
      SELECT 
        te.event_type,
        te.page_title,
        te.visitor_id,
        te.created_at,
        te.geo_country,
        te.traffic_source
      FROM public.tracking_events te
      WHERE te.tenant_id = ${tenantId}
      ORDER BY te.created_at DESC
      LIMIT 10
    `
    const recentEvents = recentEventsResult.map(r => ({
      type: r.event_type,
      page: r.page_title,
      visitor: r.visitor_id?.substring(0, 12) + '...',
      time: r.created_at,
      country: normalizeCountry(r.geo_country),
      source: r.traffic_source,
    }))

    // ==================== 汇总 ====================
    
    const summary = {
      // 今日
      todayVisitors,
      todayPageViews,
      todayTools,
      todayInquiries,
      todayEngaged,
      todayToolUsers,
      // 24小时
      visitors24h,
      // 7天
      visitors7d,
      trend7d,
      // 30天
      visitors30d,
      // 实时
      activeVisitors,
    }

    // ==================== 核心指标 ====================
    
    const metrics = {
      // 参与度
      engagementRate: todayVisitors > 0 
        ? Math.round((todayEngaged / todayVisitors) * 100) 
        : 0,
      // 工具使用率
      toolUsageRate: todayVisitors > 0 
        ? Math.round((todayToolUsers / todayVisitors) * 100) 
        : 0,
      // 转化率
      conversionRate: todayVisitors > 0 
        ? Math.round((todayInquiries / todayVisitors) * 10000) / 100 
        : 0,
      // 平均页面浏览
      avgPageViewsPerVisitor: todayVisitors > 0 
        ? Math.round((todayPageViews / todayVisitors) * 10) / 10 
        : 0,
    }

    // ==================== 实时数据 ====================
    
    const realtime = {
      activeVisitors,
      lastUpdate: now.toISOString(),
      recentEvents,
      status: 'online',
    }

    return NextResponse.json({
      summary,
      metrics,
      realtime,
    })
  } catch (error) {
    console.error('Realtime dashboard API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      realtime: null,
      summary: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, { status: 500 })
  }
}
