/**
 * 线索评分 API
 * 基于用户行为数据（访问次数、询盘次数、工具使用）动态计算线索得分
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'zxqconsulting'
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const offset = Number(searchParams.get('offset') ?? 0)

  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  try {
    const tenantRows = await sql`SELECT id FROM public.tenants WHERE slug=${tenantSlug} LIMIT 1`
    const tenantId = tenantRows[0]?.id
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    // 联合 users、inquiries、tool_interactions 计算分数
    const rows = await sql`
      SELECT
        u.id,
        u.name,
        u.company,
        u.phone,
        u.email,
        u.product_type,
        u.target_market,
        u.visit_count,
        u.inquiry_count,
        u.last_visit_at,
        u.created_at,
        COALESCE(ti.tool_count, 0) AS tool_count,
        COALESCE(ti.completed_count, 0) AS completed_count,
        (
          LEAST(COALESCE(u.visit_count, 0), 20) * 2 +
          LEAST(COALESCE(u.inquiry_count, 0), 5) * 12 +
          LEAST(COALESCE(ti.tool_count, 0), 10) * 3 +
          LEAST(COALESCE(ti.completed_count, 0), 5) * 4
        ) AS raw_score
      FROM public.users u
      LEFT JOIN (
        SELECT
          visitor_id,
          COUNT(*) AS tool_count,
          COUNT(CASE WHEN action IN ('complete','submit') THEN 1 END) AS completed_count
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId}
        GROUP BY visitor_id
      ) ti ON ti.visitor_id = u.visitor_id
      WHERE u.tenant_id = ${tenantId}
      ORDER BY raw_score DESC, u.last_visit_at DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `

    const total = await sql`SELECT COUNT(*) AS cnt FROM public.users WHERE tenant_id=${tenantId}`

    const leads = rows.map(r => {
      const raw = Math.min(Number(r.raw_score), 100)
      const score = Math.round(raw)
      const level = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'
      return {
        id: String(r.id),
        name: r.name || '匿名',
        company: r.company || '-',
        phone: r.phone || null,
        email: r.email || null,
        product: r.product_type || '-',
        market: r.target_market || '-',
        score,
        level,
        visitCount: Number(r.visit_count) || 0,
        inquiryCount: Number(r.inquiry_count) || 0,
        toolCount: Number(r.tool_count) || 0,
        completedCount: Number(r.completed_count) || 0,
        lastVisit: r.last_visit_at,
        createdAt: r.created_at,
      }
    })

    const levelStats = {
      A: leads.filter(l => l.level === 'A').length,
      B: leads.filter(l => l.level === 'B').length,
      C: leads.filter(l => l.level === 'C').length,
      D: leads.filter(l => l.level === 'D').length,
    }

    return NextResponse.json({
      leads,
      total: Number(total[0]?.cnt ?? 0),
      levelStats,
    })
  } catch (error) {
    console.error('Leads API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
