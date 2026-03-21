/**
 * 用户转化路径 API
 * 提供桑基图所需的用户转化数据
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
      data: { nodes: [], links: [] },
      error: 'Database not configured'
    })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) {
      return NextResponse.json({ data: { nodes: [], links: [] } })
    }

    // 计算日期范围
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)
    const sinceStr = sinceDate.toISOString()

    // 1. 统计各阶段的用户数
    const stageStats = await sql`
      -- 网站访问 (UV)
      SELECT '访问' as stage, COUNT(DISTINCT visitor_id) as count
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId} AND created_at >= ${sinceStr}
      UNION ALL
      -- 浏览 ≥3 页面
      SELECT '浏览' as stage, COUNT(DISTINCT visitor_id) as count
      FROM (
        SELECT visitor_id, COUNT(*) as pv
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId} AND event_type = 'page_view' AND created_at >= ${sinceStr}
        GROUP BY visitor_id
        HAVING COUNT(*) >= 3
      ) t
      UNION ALL
      -- 使用工具
      SELECT '工具' as stage, COUNT(DISTINCT visitor_id) as count
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId} AND created_at >= ${sinceStr}
      UNION ALL
      -- 提交询盘
      SELECT '询盘' as stage, COUNT(DISTINCT visitor_id) as count
      FROM public.inquiries
      WHERE tenant_id = ${tenantId} AND created_at >= ${sinceStr}
    `

    // 构建桑基图数据
    const nodes = [
      { name: '网站访问' },
      { name: '浏览3+页' },
      { name: '使用工具' },
      { name: '提交询盘' },
      { name: '流失' },
    ]

    // 从查询结果计算流量
    const statsMap = new Map<string, number>()
    for (const row of stageStats) {
      statsMap.set(row.stage, Number(row.count))
    }

    const visitors = statsMap.get('访问') || 0
    const browsed = statsMap.get('浏览') || 0
    const tools = statsMap.get('工具') || 0
    const inquiries = statsMap.get('询盘') || 0

    // 计算转化和流失
    const browseToDrop = visitors - browsed
    const toolToDrop = browsed - tools
    const inquiryToDrop = tools - inquiries

    const links = [
      { source: 0, target: 1, value: browsed },
      { source: 0, target: 4, value: browseToDrop }, // 直接流失
      { source: 1, target: 2, value: tools },
      { source: 1, target: 4, value: toolToDrop }, // 浏览后流失
      { source: 2, target: 3, value: inquiries },
      { source: 2, target: 4, value: inquiryToDrop }, // 使用工具后流失
    ]

    return NextResponse.json({
      data: { nodes, links: links.filter(l => l.value > 0) }
    })
  } catch (error) {
    console.error('Path API error:', error)
    return NextResponse.json({ 
      data: { nodes: [], links: [] },
      error: String(error) 
    }, { status: 500 })
  }
}
