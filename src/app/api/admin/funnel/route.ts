/**
 * 漏斗分析 API
 * 从真实数据库查询转化漏斗数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')
  const days = Math.min(Number(searchParams.get('days') ?? 30), 90)

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 401 })
  }

  // 数据库未配置
  if (!isDbConfigured || !sql) {
    return NextResponse.json({
      data: [],
      error: 'Database not configured'
    })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) {
      return NextResponse.json({ data: [] })
    }

    // 计算日期范围
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)
    const sinceStr = sinceDate.toISOString()

    // 1. 网站访问 (UV)
    const uvResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as uv
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND event_type = 'page_view'
        AND created_at >= ${sinceStr}
    `
    const uvCount = Number(uvResult[0]?.uv ?? 0)

    // 2. 浏览 ≥3 页面 (活跃访客)
    const activeVisitorsResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM (
        SELECT visitor_id, COUNT(*) as page_count
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND event_type = 'page_view'
          AND created_at >= ${sinceStr}
        GROUP BY visitor_id
        HAVING COUNT(*) >= 3
      ) t
    `
    const activeCount = Number(activeVisitorsResult[0]?.count ?? 0)

    // 3. 使用工具
    const toolResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${sinceStr}
    `
    const toolCount = Number(toolResult[0]?.count ?? 0)

    // 4. 提交询盘
    const inquiryResult = await sql`
      SELECT COUNT(*) as count
      FROM public.inquiries
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${sinceStr}
    `
    const inquiryCount = Number(inquiryResult[0]?.count ?? 0)

    // 5. 销售跟进 (有分配的询盘)
    const followupResult = await sql`
      SELECT COUNT(*) as count
      FROM public.inquiries
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${sinceStr}
        AND assignee IS NOT NULL
    `
    const followupCount = Number(followupResult[0]?.count ?? 0)

    // 计算转化率
    const calcRate = (count: number) => uvCount > 0 ? Math.round((count / uvCount) * 100) : 0

    const funnelData = [
      { stage: '网站访问', count: uvCount, rate: 100, dropOff: 0 },
      { stage: '浏览 ≥3 页面', count: activeCount, rate: calcRate(activeCount), dropOff: 100 - calcRate(activeCount) },
      { stage: '使用工具', count: toolCount, rate: calcRate(toolCount), dropOff: calcRate(activeCount) - calcRate(toolCount) },
      { stage: '提交询盘', count: inquiryCount, rate: calcRate(inquiryCount), dropOff: calcRate(toolCount) - calcRate(inquiryCount) },
      { stage: '销售跟进', count: followupCount, rate: calcRate(followupCount), dropOff: calcRate(inquiryCount) - calcRate(followupCount) },
    ]

    return NextResponse.json({ data: funnelData })
  } catch (error) {
    console.error('Funnel API error:', error)
    return NextResponse.json({ 
      data: [],
      error: String(error) 
    }, { status: 500 })
  }
}
