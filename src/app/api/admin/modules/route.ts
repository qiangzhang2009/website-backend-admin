/**
 * 模块使用统计 API
 * 追踪用户对各模块的使用情况
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'

// Mock 数据
const mockModuleStats = {
  bazi: { total: 150, completed: 89, abandoned: 35, avgTime: '4.2分钟', completionRate: 59.3 },
  fengshui: { total: 98, completed: 56, abandoned: 22, avgTime: '3.8分钟', completionRate: 57.1 },
  tarot: { total: 76, completed: 45, abandoned: 18, avgTime: '5.1分钟', completionRate: 59.2 },
  market: { total: 45, completed: 32, abandoned: 8, avgTime: '6.5分钟', completionRate: 71.1 },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'zxqconsulting'
  const visitorId = searchParams.get('visitor_id')
  const moduleId = searchParams.get('module_id')

  if (!isDbConfigured || !sql) {
    const data = visitorId
      ? Object.entries(mockModuleStats).map(([module, stats]) => ({ module, ...stats }))
      : Object.entries(mockModuleStats).map(([module, stats]) => ({ module, ...stats }))
    return NextResponse.json({ data, stats: mockModuleStats })
  }

  try {
    const tenantRows = await sql`SELECT id FROM public.tenants WHERE slug=${tenantSlug} LIMIT 1`
    const tenantId = tenantRows[0]?.id
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    // 获取模块统计
    let statsQuery
    if (visitorId) {
      statsQuery = await sql`
        SELECT
          module_id,
          COUNT(*) AS total,
          COUNT(CASE WHEN event_type='tool_complete' OR event_type='chat_end' THEN 1 END) AS completed,
          COUNT(CASE WHEN event_type='tool_abandon' OR event_type='abandon' THEN 1 END) AS abandoned,
          ROUND(AVG(duration_seconds)::numeric, 1) AS avg_seconds
        FROM public.module_usage
        WHERE tenant_id=${tenantId} AND visitor_id=${visitorId}
        GROUP BY module_id
        ORDER BY total DESC
      `
    } else {
      statsQuery = await sql`
        SELECT
          module_id,
          module_name,
          COUNT(*) AS total,
          COUNT(CASE WHEN event_type='tool_complete' OR event_type='chat_end' OR event_type='complete' THEN 1 END) AS completed,
          COUNT(CASE WHEN event_type='tool_abandon' OR event_type='abandon' THEN 1 END) AS abandoned,
          ROUND(AVG(duration_seconds)::numeric, 1) AS avg_seconds
        FROM public.module_usage
        WHERE tenant_id=${tenantId}
        GROUP BY module_id, module_name
        ORDER BY total DESC
      `
    }

    // 获取特定用户的模块使用记录
    let usageData: any[] = []
    if (visitorId) {
      usageData = await sql`
        SELECT module_id, module_name, event_type, duration_seconds, conversation_turns, created_at
        FROM public.module_usage
        WHERE tenant_id=${tenantId} AND visitor_id=${visitorId}
        ORDER BY created_at DESC
        LIMIT 50
      `
    }

    // 获取特定模块的使用记录
    if (moduleId) {
      usageData = await sql`
        SELECT module_id, module_name, event_type, duration_seconds, conversation_turns, input_params, output_result, created_at
        FROM public.module_usage
        WHERE tenant_id=${tenantId} AND module_id=${moduleId}
        ORDER BY created_at DESC
        LIMIT 50
      `
    }

    const stats = statsQuery.reduce((acc, r) => {
      const total = Number(r.total)
      const completed = Number(r.completed)
      const abandoned = Number(r.abandoned)
      acc[String(r.module_id)] = {
        total,
        completed,
        abandoned,
        avgTime: `${r.avg_seconds ?? 0}秒`,
        completionRate: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
      }
      return acc
    }, {})

    return NextResponse.json({
      data: usageData,
      stats,
    })
  } catch (error) {
    console.error('Modules API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
