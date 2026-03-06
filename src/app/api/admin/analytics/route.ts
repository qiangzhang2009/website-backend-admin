/**
 * 来源渠道分析 API
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'zxqconsulting'

  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  try {
    const tenantRows = await sql`SELECT id FROM public.tenants WHERE slug=${tenantSlug} LIMIT 1`
    const tenantId = tenantRows[0]?.id
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const [sourceStats, topPages, inquiryFunnel] = await Promise.all([
      // 来源分布（从 referrer 推断）
      sql`
        SELECT
          CASE
            WHEN referrer IS NULL OR referrer='' THEN '直接访问'
            WHEN referrer ILIKE '%google%' OR referrer ILIKE '%baidu%' OR referrer ILIKE '%bing%' THEN '搜索引擎'
            WHEN referrer ILIKE '%facebook%' OR referrer ILIKE '%twitter%' OR referrer ILIKE '%weibo%' OR referrer ILIKE '%wechat%' THEN '社交媒体'
            ELSE '外部链接'
          END AS source,
          COUNT(*) AS cnt
        FROM public.tracking_events
        WHERE tenant_id=${tenantId} AND event_type='page_view'
        GROUP BY source
        ORDER BY cnt DESC
      `,
      // 热门页面
      sql`
        SELECT
          page_path AS page,
          COUNT(*) AS pv,
          COUNT(DISTINCT visitor_id) AS uv
        FROM public.tracking_events
        WHERE tenant_id=${tenantId} AND event_type='page_view' AND page_path IS NOT NULL
        GROUP BY page_path
        ORDER BY pv DESC
        LIMIT 10
      `,
      // 转化漏斗
      sql`
        SELECT
          COUNT(DISTINCT visitor_id) AS visitors,
          (SELECT COUNT(DISTINCT visitor_id) FROM public.tool_interactions WHERE tenant_id=${tenantId}) AS tool_users,
          (SELECT COUNT(DISTINCT visitor_id) FROM public.inquiries WHERE tenant_id=${tenantId}) AS inquiry_users,
          (SELECT COUNT(DISTINCT visitor_id) FROM public.inquiries WHERE tenant_id=${tenantId} AND status='completed') AS converted
        FROM public.tracking_events
        WHERE tenant_id=${tenantId}
      `,
    ])

    return NextResponse.json({
      sourceStats: sourceStats.map(r => ({ source: String(r.source), count: Number(r.cnt) })),
      topPages: topPages.map(r => ({
        page: String(r.page),
        pv: Number(r.pv),
        uv: Number(r.uv),
      })),
      funnel: inquiryFunnel[0]
        ? {
            visitors: Number(inquiryFunnel[0].visitors),
            toolUsers: Number(inquiryFunnel[0].tool_users),
            inquiryUsers: Number(inquiryFunnel[0].inquiry_users),
            converted: Number(inquiryFunnel[0].converted),
          }
        : { visitors: 0, toolUsers: 0, inquiryUsers: 0, converted: 0 },
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
