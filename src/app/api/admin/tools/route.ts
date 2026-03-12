/**
 * 工具使用统计 API - 支持分页
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const toolFilter = searchParams.get('tool')

  // 租户验证
  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter. Please provide a valid tenant slug.' },
      { status: 401 }
    )
  }

  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const offset = (page - 1) * pageSize

    // 构建查询条件
    let whereClause = sql`WHERE tenant_id=${tenantId}`
    if (toolFilter && toolFilter !== 'all') {
      whereClause = sql`${whereClause} AND tool_name=${toolFilter}`
    }

    // 查询统计数据
    const toolStats = await sql`
      SELECT
        tool_name,
        COUNT(*) AS total,
        COUNT(CASE WHEN action IN ('complete', 'submit', 'view', 'done') THEN 1 END) AS completed,
        COUNT(CASE WHEN action IN ('abandon', 'cancel', 'reset') OR action LIKE '%abandon%' THEN 1 END) AS abandoned,
        ROUND(AVG(duration_ms)::numeric / 1000, 1) AS avg_seconds
      FROM public.tool_interactions
      WHERE tenant_id=${tenantId}
      GROUP BY tool_name
      ORDER BY total DESC
    `

    // 查询总记录数
    const countResult = await sql`
      SELECT COUNT(*) as total FROM public.tool_interactions ${whereClause}
    `
    const total = Number(countResult[0]?.total || 0)

    // 查询分页数据
    const recentInteractions = await sql`
      SELECT tool_name, action, visitor_id, created_at, input_params, output_result
      FROM public.tool_interactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `

    return NextResponse.json({
      toolStats: toolStats.map(r => ({
        tool: String(r.tool_name),
        total: Number(r.total),
        completed: Number(r.completed),
        abandoned: Number(r.abandoned),
        avgTime: `${r.avg_seconds ?? 0}s`,
        completionRate: r.total > 0
          ? Number(((Number(r.completed) / Number(r.total)) * 100).toFixed(1))
          : 0,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      recentInteractions: recentInteractions.map(r => ({
        tool_name: r.tool_name,
        action: r.action,
        visitor_id: r.visitor_id,
        created_at: r.created_at,
        input_params: r.input_params,
        output_result: r.output_result,
      })),
    })
  } catch (error) {
    console.error('Tools API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
