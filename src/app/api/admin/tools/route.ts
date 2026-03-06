/**
 * 工具使用统计 API
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
        SELECT tool_name, action, visitor_id, created_at
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
      recentInteractions,
    })
  } catch (error) {
    console.error('Tools API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
