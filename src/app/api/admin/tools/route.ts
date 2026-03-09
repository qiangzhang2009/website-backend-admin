/**
 * 工具使用统计 API
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

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

  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const [toolStats, recentInteractions] = await Promise.all([
      sql`
        SELECT
          tool_name,
          COUNT(*) AS total,
          COUNT(CASE WHEN action='complete' OR action='submit' THEN 1 END) AS completed,
          COUNT(CASE WHEN action='abandon' THEN 1 END) AS abandoned,
          ROUND(AVG(duration_ms)::numeric / 1000, 1) AS avg_seconds
        FROM public.tool_interactions
        WHERE tenant_id=${tenantId}
        GROUP BY tool_name
        ORDER BY total DESC
      `,
      sql`
        SELECT tool_name, action, visitor_id, created_at, input_params, output_result
        FROM public.tool_interactions
        WHERE tenant_id=${tenantId}
        ORDER BY created_at DESC
        LIMIT 20
      `,
    ])

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
