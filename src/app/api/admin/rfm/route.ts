/**
 * RFM 分析 API
 * 用户价值分层分析 - 基于真实数据
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

    // 获取访问统计数据
    const visitorStats = await sql`
      SELECT 
        visitor_id,
        MAX(created_at) AS last_visit,
        COUNT(*) AS visit_count
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
      GROUP BY visitor_id
      LIMIT 100
    `

    // 获取询盘统计
    const inquiryStats = await sql`
      SELECT 
        visitor_id,
        COUNT(*) AS inquiry_count
      FROM public.inquiries
      WHERE tenant_id = ${tenantId}
      GROUP BY visitor_id
    `

    // 获取工具使用统计
    const toolStats = await sql`
      SELECT 
        visitor_id,
        COUNT(*) AS tool_count
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId}
      GROUP BY visitor_id
    `

    // 创建查询映射
    const inquiryMap = new Map(inquiryStats.map((r: any) => [r.visitor_id, Number(r.inquiry_count)]))
    const toolMap = new Map(toolStats.map((r: any) => [r.visitor_id, Number(r.tool_count)]))

    // 计算 RFM
    const now = new Date()
    const data = visitorStats.map((r: any) => {
      const lastVisit = new Date(r.last_visit)
      const daysSinceLastVisit = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      const visitCount = Number(r.visit_count)
      const inquiryCount = inquiryMap.get(r.visitor_id) || 0
      const toolCount = toolMap.get(r.visitor_id) || 0

      // R 分数
      let rScore = 1
      if (daysSinceLastVisit <= 7) rScore = 5
      else if (daysSinceLastVisit <= 14) rScore = 4
      else if (daysSinceLastVisit <= 30) rScore = 3
      else if (daysSinceLastVisit <= 90) rScore = 2

      // F 分数
      let fScore = 1
      if (visitCount >= 20) fScore = 5
      else if (visitCount >= 10) fScore = 4
      else if (visitCount >= 5) fScore = 3
      else if (visitCount >= 2) fScore = 2

      // M 分数
      let mScore = 1
      const totalValue = inquiryCount + toolCount
      if (totalValue >= 10) mScore = 5
      else if (totalValue >= 5) mScore = 4
      else if (totalValue >= 2) mScore = 3
      else if (totalValue >= 1) mScore = 2

      const rfmScore = rScore + fScore + mScore
      let rfmSegment = 'Lost'
      if (rfmScore >= 13) rfmSegment = 'VIP'
      else if (rfmScore >= 10) rfmSegment = 'Regular'
      else if (rfmScore >= 7) rfmSegment = 'At_Risk'

      return {
        visitorId: r.visitor_id,
        lastVisit: r.last_visit,
        visitCount,
        inquiryCount,
        toolCount: toolCount,
        rScore,
        fScore,
        mScore,
        rfmScore,
        rfmSegment,
      }
    })

    // 统计各分段
    const summary = {
      VIP: data.filter(d => d.rfmSegment === 'VIP').length,
      Regular: data.filter(d => d.rfmSegment === 'Regular').length,
      At_Risk: data.filter(d => d.rfmSegment === 'At_Risk').length,
      Lost: data.filter(d => d.rfmSegment === 'Lost').length,
      total: data.length,
    }

    return NextResponse.json({ data, summary })
  } catch (error) {
    console.error('RFM API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'RFM 数据已实时计算' 
  })
}
