/**
 * 内容热度分析 API
 * 追踪页面/工具/内容的访问热度
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

// Mock 数据
const mockContentData = [
  { contentType: 'tool', contentId: 'bazi', contentName: '八字分析', viewCount: 1250, uniqueViewers: 890, avgDuration: 245, interactionCount: 456 },
  { contentType: 'tool', contentId: 'fengshui', contentName: '风水布局', viewCount: 980, uniqueViewers: 720, avgDuration: 198, interactionCount: 345 },
  { contentType: 'tool', contentId: 'market', contentName: '市场成本计算器', viewCount: 756, uniqueViewers: 534, avgDuration: 320, interactionCount: 234 },
  { contentType: 'page', contentId: 'home', contentName: '首页', viewCount: 5420, uniqueViewers: 3210, avgDuration: 45, interactionCount: 0 },
  { contentType: 'page', contentId: 'services', contentName: '服务介绍', viewCount: 2340, uniqueViewers: 1560, avgDuration: 120, interactionCount: 0 },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')
  const contentType = searchParams.get('contentType')

  // 租户验证
  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter. Please provide a valid tenant slug.' },
      { status: 401 }
    )
  }

  if (!isDbConfigured || !sql) {
    const data = contentType
      ? mockContentData.filter(c => c.contentType === contentType)
      : mockContentData
    return NextResponse.json({
      data,
      summary: {
        totalViews: mockContentData.reduce((sum, c) => sum + c.viewCount, 0),
        totalUniqueViewers: new Set(mockContentData.map(c => c.contentId)).size,
        topContent: mockContentData.sort((a, b) => b.viewCount - a.viewCount).slice(0, 5),
      },
    })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    let query
    if (contentType) {
      query = await sql`
        SELECT content_type, content_id, content_name, view_count, unique_viewers, avg_duration_seconds, interaction_count, conversion_count, last_viewed_at
        FROM public.content_analytics
        WHERE tenant_id=${tenantId} AND content_type=${contentType}
        ORDER BY view_count DESC
        LIMIT 50
      `
    } else {
      query = await sql`
        SELECT content_type, content_id, content_name, view_count, unique_viewers, avg_duration_seconds, interaction_count, conversion_count, last_viewed_at
        FROM public.content_analytics
        WHERE tenant_id=${tenantId}
        ORDER BY view_count DESC
        LIMIT 50
      `
    }

    // 获取总体统计
    const summaryQuery = await sql`
      SELECT 
        SUM(view_count) AS total_views,
        SUM(unique_viewers) AS total_unique,
        SUM(interaction_count) AS total_interactions
      FROM public.content_analytics
      WHERE tenant_id=${tenantId}
    `

    const data = query.map(r => ({
      contentType: r.content_type,
      contentId: r.content_id,
      contentName: r.content_name,
      viewCount: r.view_count,
      uniqueViewers: r.unique_viewers,
      avgDuration: r.avg_duration_seconds,
      interactionCount: r.interaction_count,
      conversionCount: r.conversion_count,
      lastViewedAt: r.last_viewed_at,
    }))

    return NextResponse.json({
      data,
      summary: {
        totalViews: Number(summaryQuery[0]?.total_views ?? 0),
        totalUniqueViewers: Number(summaryQuery[0]?.total_unique ?? 0),
        totalInteractions: Number(summaryQuery[0]?.total_interactions ?? 0),
        topContent: data.slice(0, 5),
      },
    })
  } catch (error) {
    console.error('Content Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
