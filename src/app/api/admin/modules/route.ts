/**
 * 模块使用统计 API
 * 从真实数据库追踪用户对各模块的使用情况
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter' },
      { status: 401 }
    )
  }

  // 数据库未配置
  if (!isDbConfigured || !sql) {
    return NextResponse.json({ 
      data: [], 
      stats: {},
      error: 'Database not configured'
    })
  }

  const visitorId = searchParams.get('visitor_id')
  const moduleId = searchParams.get('module_id')

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) {
      return NextResponse.json({ data: [], stats: {} })
    }

    // 从 tool_interactions 表获取模块统计 - 使用 LOWER 函数合并同名称数据
    let statsQuery
    if (visitorId) {
      statsQuery = await sql`
        SELECT
          LOWER(tool_name) as module_id,
          COUNT(*) AS total,
          COUNT(CASE WHEN action='complete' THEN 1 END) AS completed,
          COUNT(CASE WHEN action='abandon' THEN 1 END) AS abandoned,
          ROUND(AVG(duration_seconds)::numeric, 1) AS avg_seconds
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId} AND visitor_id = ${visitorId}
        GROUP BY LOWER(tool_name)
        ORDER BY total DESC
      `
    } else {
      statsQuery = await sql`
        SELECT
          LOWER(tool_name) as module_id,
          COUNT(*) AS total,
          COUNT(CASE WHEN action='complete' THEN 1 END) AS completed,
          COUNT(CASE WHEN action='abandon' THEN 1 END) AS abandoned,
          ROUND(AVG(duration_seconds)::numeric, 1) AS avg_seconds
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId}
        GROUP BY LOWER(tool_name)
        ORDER BY total DESC
      `
    }

    // 获取使用记录 - 使用 LOWER 函数合并同名称数据
    let usageData: any[] = []
    if (visitorId) {
      usageData = await sql`
        SELECT id, visitor_id, LOWER(tool_name) as module_id, action, duration_seconds, conversation_turns, input_data, output_data, created_at
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId} AND visitor_id = ${visitorId}
        ORDER BY created_at DESC
        LIMIT 50
      `
    } else if (moduleId) {
      usageData = await sql`
        SELECT id, visitor_id, LOWER(tool_name) as module_id, action, duration_seconds, conversation_turns, input_data, output_data, created_at
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId} AND LOWER(tool_name) = ${moduleId.toLowerCase()}
        ORDER BY created_at DESC
        LIMIT 50
      `
    }

    // 汇总统计数据
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
    return NextResponse.json({ 
      data: [], 
      stats: {},
      error: String(error) 
    }, { status: 500 })
  }
}
