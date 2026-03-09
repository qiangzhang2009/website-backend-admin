/**
 * RFM 分析 API
 * 用户价值分层分析
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

// Mock 数据
const mockRfmData = [
  { visitorId: 'v1', rScore: 5, fScore: 4, mScore: 5, rfmScore: 14, rfmSegment: 'VIP' },
  { visitorId: 'v2', rScore: 4, fScore: 3, mScore: 4, rfmScore: 11, rfmSegment: 'Regular' },
  { visitorId: 'v3', rScore: 2, fScore: 2, mScore: 3, rfmScore: 7, rfmSegment: 'At_Risk' },
  { visitorId: 'v4', rScore: 1, fScore: 1, mScore: 2, rfmScore: 4, rfmSegment: 'Lost' },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  // 租户验证
  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter. Please provide a valid tenant slug.' },
      { status: 401 }
    )
  }

  const segment = searchParams.get('segment')

  if (!isDbConfigured || !sql) {
    return NextResponse.json({
      data: segment ? mockRfmData.filter(r => r.rfmSegment === segment) : mockRfmData,
      summary: {
        VIP: 125,
        Regular: 456,
        At_Risk: 234,
        Lost: 89,
        total: 904,
      },
    })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    // 获取 RFM 数据
    let query
    if (segment) {
      query = await sql`
        SELECT visitor_id, r_score, f_score, m_score, rfm_score, rfm_segment, calculated_at
        FROM public.rfm_analysis
        WHERE tenant_id=${tenantId} AND rfm_segment=${segment}
        ORDER BY rfm_score DESC
        LIMIT 100
      `
    } else {
      query = await sql`
        SELECT visitor_id, r_score, f_score, m_score, rfm_score, rfm_segment, calculated_at
        FROM public.rfm_analysis
        WHERE tenant_id=${tenantId}
        ORDER BY rfm_score DESC
        LIMIT 100
      `
    }

    // 获取各分段统计
    const summary = await sql`
      SELECT rfm_segment, COUNT(*) AS count
      FROM public.rfm_analysis
      WHERE tenant_id=${tenantId}
      GROUP BY rfm_segment
    `

    const summaryMap = summary.reduce((acc, r) => {
      acc[String(r.rfm_segment)] = Number(r.count)
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      data: query.map(r => ({
        visitorId: r.visitor_id,
        rScore: r.r_score,
        fScore: r.f_score,
        mScore: r.m_score,
        rfmScore: r.rfm_score,
        rfmSegment: r.rfm_segment,
        calculatedAt: r.calculated_at,
      })),
      summary: {
        VIP: summaryMap['VIP'] ?? 0,
        Regular: summaryMap['Regular'] ?? 0,
        At_Risk: summaryMap['At_Risk'] ?? 0,
        Lost: summaryMap['Lost'] ?? 0,
        total: query.length,
      },
    })
  } catch (error) {
    console.error('RFM API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 手动触发 RFM 计算
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  // 租户验证
  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter. Please provide a valid tenant slug.' },
      { status: 401 }
    )
  }

  if (!isDbConfigured || !sql) {
    return NextResponse.json({ success: true, mock: true, message: 'RFM calculation triggered (mock)' })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    // 计算 RFM 分数
    // R: 最近一次访问 (5=最近, 1=最久)
    // F: 访问频率 (5=高频, 1=低频)
    // M: 行为量/价值 (5=高价值, 1=低价值)

    // 获取用户访问数据
    const userData = await sql`
      SELECT 
        visitor_id,
        MAX(last_visit_at) AS last_visit,
        COUNT(*) AS visit_count,
        SUM(visit_count) AS total_actions
      FROM public.users
      WHERE tenant_id=${tenantId}
      GROUP BY visitor_id
    `

    // 计算 RFM 分数并插入
    for (const user of userData) {
      const lastVisit = new Date(user.last_visit)
      const now = new Date()
      const daysSinceLastVisit = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))

      // R 分数：7天内=5, 14天内=4, 30天内=3, 90天内=2, >90天=1
      let rScore = 1
      if (daysSinceLastVisit <= 7) rScore = 5
      else if (daysSinceLastVisit <= 14) rScore = 4
      else if (daysSinceLastVisit <= 30) rScore = 3
      else if (daysSinceLastVisit <= 90) rScore = 2

      // F 分数：>10次=5, 5-10次=4, 2-4次=3, 2次=2, 1次=1
      let fScore = 1
      if (user.visit_count > 10) fScore = 5
      else if (user.visit_count >= 5) fScore = 4
      else if (user.visit_count >= 2) fScore = 3
      else if (user.visit_count === 2) fScore = 2

      // M 分数：基于行为量估算
      let mScore = 1
      const totalActions = Number(user.total_actions ?? 0)
      if (totalActions > 20) mScore = 5
      else if (totalActions >= 10) mScore = 4
      else if (totalActions >= 5) mScore = 3
      else if (totalActions >= 2) mScore = 2

      // RFM 分段
      const rfmScore = rScore + fScore + mScore
      let segment = 'Regular'
      if (rfmScore >= 13) segment = 'VIP'
      else if (rfmScore >= 10) segment = 'Regular'
      else if (rfmScore >= 7) segment = 'At_Risk'
      else segment = 'Lost'

      await sql`
        INSERT INTO public.rfm_analysis (tenant_id, visitor_id, r_score, f_score, m_score, rfm_score, rfm_segment)
        VALUES (${tenantId}, ${user.visitor_id}, ${rScore}, ${fScore}, ${mScore}, ${rfmScore}, ${segment})
        ON CONFLICT (tenant_id, visitor_id)
        DO UPDATE SET
          r_score = EXCLUDED.r_score,
          f_score = EXCLUDED.f_score,
          m_score = EXCLUDED.m_score,
          rfm_score = EXCLUDED.rfm_score,
          rfm_segment = EXCLUDED.rfm_segment,
          calculated_at = NOW()
      `
    }

    return NextResponse.json({ success: true, processed: userData.length })
  } catch (error) {
    console.error('RFM calculation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
