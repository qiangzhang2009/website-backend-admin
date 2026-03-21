/**
 * 工具使用统计 API - 支持分页、筛选、导出
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

// 工具名称中文映射
const TOOL_NAME_MAPPING: Record<string, string> = {
  ai_chat: 'AI智能对话', bazi: '八字算命', zhanbu: '占卜问卦', tarot: '塔罗牌',
  fengshui: '风水布局', dream: '周公解梦', zodiac: '星座运势', mbti: 'MBTI测试',
  palm: '手相分析', draw: '抽签', naming: '宝宝起名', company_naming: '公司起名',
  marriage: '婚配配对', huangdi: '黄帝内经', lifenumber: '生命灵数', ziwei: '紫微斗数',
  zhouyi: '周易预测', luckyday: '吉日选择', digital: '数字命理', daodejing: '道德经',
  question: '问卦', market: '市场选择器', cost: '成本计算器', policy: '政策查询',
  decision: '决策工作台', import: '进口商品分析', export: '出口市场分析',
  analysis_tab: '市场分析', feasibility_analysis: '可行性分析', full_analysis: '完整分析',
  home: '首页', about: '关于我们', contact: '联系我们', tools: '工具列表',
}

// 动作名称中文映射
const ACTION_MAPPING: Record<string, string> = {
  complete: '完成', completed: '完成', submit: '提交', view: '查看', done: '完成',
  start: '开始', switch: '切换', select: '选择',
  abandon: '放弃', cancel: '取消', reset: '重置', abandoned: '放弃',
  input: '输入', tool_start: '开始', tool_input: '输入', tool_output: '输出',
  tool_complete: '完成', tool_abandon: '放弃', save: '保存',
}

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

    // 构建工具筛选条件 - 使用 LOWER 函数进行不区分大小写的匹配
    let toolCondition = sql``
    if (toolFilter && toolFilter !== 'all') {
      toolCondition = sql`AND LOWER(tool_name) = ${toolFilter.toLowerCase()}`
    }

    // 查询统计数据（带日期筛选）- 使用 LOWER 函数合并同名称数据
    const toolStats = await sql`
      SELECT
        LOWER(tool_name) as tool_name,
        COUNT(*) AS total,
        COUNT(CASE WHEN action IN ('complete', 'submit', 'view', 'done') THEN 1 END) AS completed,
        COUNT(CASE WHEN action IN ('abandon', 'cancel', 'reset') OR action LIKE '%abandon%' THEN 1 END) AS abandoned,
        ROUND(AVG(duration_ms)::numeric / 1000, 1) AS avg_seconds
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId} ${dateCondition}
      GROUP BY LOWER(tool_name)
      ORDER BY total DESC
    `

    // 查询总记录数
    const countResult = await sql`
      SELECT COUNT(*) as total FROM public.tool_interactions
      WHERE tenant_id = ${tenantId} ${dateCondition} ${toolCondition}
    `
    const total = Number(countResult[0]?.total || 0)

    // 查询趋势数据（按天汇总）- 使用 LOWER 函数合并同名称数据
    const trendData = await sql`
      SELECT
        DATE(created_at) as date,
        LOWER(tool_name) as tool_name,
        COUNT(*) as count,
        COUNT(CASE WHEN action IN ('complete', 'submit', 'view', 'done') THEN 1 END) as completed
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId} ${dateCondition}
      GROUP BY DATE(created_at), LOWER(tool_name)
      ORDER BY date DESC
      LIMIT 100
    `

    // 查询分页数据 - 使用 LOWER 函数合并同名称数据
    const recentInteractions = await sql`
      SELECT LOWER(tool_name) as tool_name, action, visitor_id, created_at, input_params, output_result, duration_ms
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId} ${dateCondition} ${toolCondition}
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `

    // 如果是导出请求
    if (exportFormat === 'csv' || exportFormat === 'json') {
      // 获取所有符合条件的数据（不分页）- 使用 LOWER 函数合并同名称数据
      const allData = await sql`
        SELECT LOWER(tool_name) as tool_name, action, visitor_id, created_at, input_params, output_result, duration_ms
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId} ${dateCondition} ${toolCondition}
        ORDER BY created_at DESC
        LIMIT 1000
      `

      if (exportFormat === 'json') {
        return NextResponse.json({
          data: allData.map(r => ({
            tool_name: TOOL_NAME_MAPPING[r.tool_name] || r.tool_name,
            action: ACTION_MAPPING[r.action] || r.action,
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
          TOOL_NAME_MAPPING[row.tool_name] || row.tool_name,
          ACTION_MAPPING[row.action] || row.action,
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
        tool_name: TOOL_NAME_MAPPING[r.tool_name] || r.tool_name,
        action: ACTION_MAPPING[r.action] || r.action,
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
