/**
 * 内容热度分析 API
 * 从 tracking_events 和 tool_interactions 获取真实数据
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter. Please provide a valid tenant slug.' },
      { status: 401 }
    )
  }

  if (!isDbConfigured || !sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    // 从 tracking_events 获取页面浏览数据
    const pageStats = await sql`
      SELECT 
        page_url,
        COUNT(*) AS view_count,
        COUNT(DISTINCT visitor_id) AS unique_viewers
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId} AND event_type = 'page_view' AND page_url IS NOT NULL
      GROUP BY page_url
      ORDER BY view_count DESC
      LIMIT 20
    `

    // 从 tool_interactions 获取工具使用数据 - 使用 LOWER 函数合并同名称数据
    const toolStats = await sql`
      SELECT 
        LOWER(tool_name) as tool_name,
        COUNT(*) AS view_count,
        COUNT(DISTINCT visitor_id) AS unique_viewers,
        COUNT(CASE WHEN action = 'tool_complete' THEN 1 END) AS interaction_count
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId}
      GROUP BY LOWER(tool_name)
      ORDER BY view_count DESC
      LIMIT 20
    `

    // 合并数据
    const data = [
      ...pageStats.map((r: any) => ({
        contentType: 'page',
        contentId: r.page_url,
        contentName: r.page_url,
        viewCount: Number(r.view_count),
        uniqueViewers: Number(r.unique_viewers),
        avgDuration: 0,
        interactionCount: 0,
      })),
      ...toolStats.map((r: any) => ({
        contentType: 'tool',
        contentId: r.tool_name,
        contentName: r.tool_name,
        viewCount: Number(r.view_count),
        uniqueViewers: Number(r.unique_viewers),
        avgDuration: 0,
        interactionCount: Number(r.interaction_count),
      })),
    ].sort((a: any, b: any) => b.viewCount - a.viewCount)

    const totalViews = data.reduce((sum: number, c: any) => sum + c.viewCount, 0)

    return NextResponse.json({
      data,
      summary: {
        totalViews,
        totalUniqueViewers: data.length,
        topContent: data.slice(0, 5),
      },
    })
  } catch (error) {
    console.error('Content API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
