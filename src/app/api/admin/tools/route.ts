/**
 * 工具使用统计 API - 支持分页、筛选、导出
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
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const exportFormat = searchParams.get('export')

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

    // 构建日期筛选条件
    let dateCondition = sql``
    if (startDate && endDate) {
      dateCondition = sql`AND created_at >= ${startDate} AND created_at < ${endDate}::date + interval '1 day'`
    } else if (startDate) {
      dateCondition = sql`AND created_at >= ${startDate}`
    } else if (endDate) {
      dateCondition = sql`AND created_at < ${endDate}::date + interval '1 day'`
    }

    // 构建工具筛选条件
    let toolCondition = sql``
    if (toolFilter && toolFilter !== 'all') {
      toolCondition = sql`AND tool_name = ${toolFilter}`
    }

    // 查询统计数据（带日期筛选）
    const toolStats = await sql`
      SELECT
        tool_name,
        COUNT(*) AS total,
        COUNT(CASE WHEN action IN ('complete', 'submit', 'view', 'done') THEN 1 END) AS completed,
        COUNT(CASE WHEN action IN ('abandon', 'cancel', 'reset') OR action LIKE '%abandon%' THEN 1 END) AS abandoned,
        ROUND(AVG(duration_ms)::numeric / 1000, 1) AS avg_seconds
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId} ${dateCondition}
      GROUP BY tool_name
      ORDER BY total DESC
    `

    // 查询总记录数
    const countResult = await sql`
      SELECT COUNT(*) as total FROM public.tool_interactions
      WHERE tenant_id = ${tenantId} ${dateCondition} ${toolCondition}
    `
    const total = Number(countResult[0]?.total || 0)

    // 查询趋势数据（按天汇总）
    const trendData = await sql`
      SELECT
        DATE(created_at) as date,
        tool_name,
        COUNT(*) as count,
        COUNT(CASE WHEN action IN ('complete', 'submit', 'view', 'done') THEN 1 END) as completed
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId} ${dateCondition}
      GROUP BY DATE(created_at), tool_name
      ORDER BY date DESC
      LIMIT 100
    `

    // 查询分页数据
    const recentInteractions = await sql`
      SELECT tool_name, action, visitor_id, created_at, input_params, output_result, duration_ms
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId} ${dateCondition} ${toolCondition}
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `

    // 如果是导出请求
    if (exportFormat === 'csv' || exportFormat === 'json') {
      // 获取所有符合条件的数据（不分页）
      const allData = await sql`
        SELECT tool_name, action, visitor_id, created_at, input_params, output_result, duration_ms
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId} ${dateCondition} ${toolCondition}
        ORDER BY created_at DESC
        LIMIT 1000
      `

      if (exportFormat === 'json') {
        return NextResponse.json({
          data: allData.map(r => ({
            tool_name: r.tool_name,
            action: r.action,
            visitor_id: r.visitor_id,
            created_at: r.created_at,
            input_params: r.input_params,
            output_result: r.output_result,
            duration_ms: r.duration_ms,
          })),
          exportedAt: new Date().toISOString(),
          total: allData.length,
        })
      }

      // CSV 导出
      const headers = ['工具名称', '动作', '访客ID', '时间', '用时(毫秒)', '输入参数', '输出结果']
      const csvRows = [headers.join(',')]

      for (const row of allData) {
        const values = [
          row.tool_name,
          row.action,
          row.visitor_id || '',
          row.created_at,
          row.duration_ms || '',
          JSON.stringify(row.input_params || {}).replace(/"/g, '""'),
          JSON.stringify(row.output_result || {}).replace(/"/g, '""'),
        ].map(v => `"${v}"`).join(',')
        csvRows.push(values)
      }

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="tool_interactions_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

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
      trendData: trendData.map(r => ({
        date: r.date,
        tool: r.tool_name,
        count: Number(r.count),
        completed: Number(r.completed),
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
        duration_ms: r.duration_ms,
      })),
    })
  } catch (error) {
    console.error('Tools API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
