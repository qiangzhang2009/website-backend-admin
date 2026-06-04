/**
 * Admin AI Assistant — Real Database Query Engine
 * Converts natural language queries into database queries and returns real data
 */

import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantIdBySlug } from '@/lib/db'

function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN')
}

function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`
}

async function getTodayStats(tenantId: string) {
  if (!sql) return null
  const [events, sessions, tools, inquiries] = await Promise.all([
    sql`SELECT COUNT(DISTINCT visitor_id)::int as uv, COUNT(*)::int as pv
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND created_at > CURRENT_DATE
          AND event_type = 'page_view'`,
    sql`SELECT COUNT(DISTINCT session_id)::int as sessions
        FROM public.sessions
        WHERE tenant_id = ${tenantId}
          AND created_at > CURRENT_DATE`,
    sql`SELECT COUNT(DISTINCT visitor_id)::int as tool_users, COUNT(*)::int as tool_count
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId}
          AND created_at > CURRENT_DATE
          AND action IN ('tool_start', 'tool_complete')`,
    sql`SELECT COUNT(*)::int as count
        FROM public.inquiries
        WHERE tenant_id = ${tenantId}
          AND created_at > CURRENT_DATE`,
  ])
  return {
    uv: events[0]?.uv ?? 0,
    pv: events[0]?.pv ?? 0,
    sessions: sessions[0]?.sessions ?? 0,
    toolUsers: tools[0]?.tool_users ?? 0,
    toolCount: tools[0]?.tool_count ?? 0,
    inquiries: inquiries[0]?.count ?? 0,
  }
}

async function getYesterdayStats(tenantId: string) {
  if (!sql) return null
  const [events, sessions, tools, inquiries] = await Promise.all([
    sql`SELECT COUNT(DISTINCT visitor_id)::int as uv, COUNT(*)::int as pv
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND created_at > CURRENT_DATE - INTERVAL '1 day'
          AND created_at <= CURRENT_DATE
          AND event_type = 'page_view'`,
    sql`SELECT COUNT(DISTINCT session_id)::int as sessions
        FROM public.sessions
        WHERE tenant_id = ${tenantId}
          AND created_at > CURRENT_DATE - INTERVAL '1 day'
          AND created_at <= CURRENT_DATE`,
    sql`SELECT COUNT(DISTINCT visitor_id)::int as tool_users
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId}
          AND created_at > CURRENT_DATE - INTERVAL '1 day'
          AND created_at <= CURRENT_DATE
          AND action = 'tool_complete'`,
    sql`SELECT COUNT(*)::int as count
        FROM public.inquiries
        WHERE tenant_id = ${tenantId}
          AND created_at > CURRENT_DATE - INTERVAL '1 day'
          AND created_at <= CURRENT_DATE`,
  ])
  return {
    uv: events[0]?.uv ?? 0,
    pv: events[0]?.pv ?? 0,
    sessions: sessions[0]?.sessions ?? 0,
    toolUsers: tools[0]?.tool_users ?? 0,
    inquiries: inquiries[0]?.count ?? 0,
  }
}

async function getWeekStats(tenantId: string) {
  if (!sql) return null
  const [events, sessions, tools, inquiries, leads] = await Promise.all([
    sql`SELECT COUNT(DISTINCT visitor_id)::int as uv, COUNT(*)::int as pv
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '7 days'
          AND event_type = 'page_view'`,
    sql`SELECT COUNT(DISTINCT session_id)::int as sessions
        FROM public.sessions
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '7 days'`,
    sql`SELECT COUNT(DISTINCT visitor_id)::int as tool_users
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '7 days'
          AND action = 'tool_complete'`,
    sql`SELECT COUNT(*)::int as inquiries, COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed
        FROM public.inquiries
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '7 days'`,
    sql`SELECT COUNT(*)::int as leads
        FROM public.users
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '7 days'`,
  ])
  return {
    uv: events[0]?.uv ?? 0,
    pv: events[0]?.pv ?? 0,
    sessions: sessions[0]?.sessions ?? 0,
    toolUsers: tools[0]?.tool_users ?? 0,
    inquiries: inquiries[0]?.inquiries ?? 0,
    completed: inquiries[0]?.completed ?? 0,
    leads: leads[0]?.leads ?? 0,
  }
}

async function getMonthStats(tenantId: string) {
  if (!sql) return null
  const [events, sessions, tools, inquiries, leads] = await Promise.all([
    sql`SELECT COUNT(DISTINCT visitor_id)::int as uv, COUNT(*)::int as pv
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '30 days'
          AND event_type = 'page_view'`,
    sql`SELECT COUNT(DISTINCT session_id)::int as sessions
        FROM public.sessions
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '30 days'`,
    sql`SELECT COUNT(DISTINCT visitor_id)::int as tool_users, COUNT(*)::int as tool_count
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '30 days'
          AND action IN ('tool_start', 'tool_complete')`,
    sql`SELECT COUNT(*)::int as inquiries,
              COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed,
              COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending
        FROM public.inquiries
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '30 days'`,
    sql`SELECT COUNT(*)::int as leads
        FROM public.users
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '30 days'`,
  ])
  return {
    uv: events[0]?.uv ?? 0,
    pv: events[0]?.pv ?? 0,
    sessions: sessions[0]?.sessions ?? 0,
    toolUsers: tools[0]?.tool_users ?? 0,
    toolCount: tools[0]?.tool_count ?? 0,
    inquiries: inquiries[0]?.inquiries ?? 0,
    completed: inquiries[0]?.completed ?? 0,
    pending: inquiries[0]?.pending ?? 0,
    leads: leads[0]?.leads ?? 0,
  }
}

async function getTrafficSources(tenantId: string) {
  if (!sql) return null
  const rows = await sql`
    SELECT traffic_source,
           COUNT(DISTINCT visitor_id)::int as visitors,
           COUNT(*)::int as events
    FROM public.tracking_events
    WHERE tenant_id = ${tenantId}
      AND created_at > NOW() - INTERVAL '7 days'
      AND traffic_source IS NOT NULL
      AND traffic_source != ''
    GROUP BY traffic_source
    ORDER BY visitors DESC
    LIMIT 5
  `
  return rows
}

async function getGeoDistribution(tenantId: string) {
  if (!sql) return null
  const rows = await sql`
    SELECT geo_country,
           COUNT(DISTINCT visitor_id)::int as visitors
    FROM public.tracking_events
    WHERE tenant_id = ${tenantId}
      AND created_at > NOW() - INTERVAL '7 days'
      AND geo_country IS NOT NULL
      AND geo_country != ''
    GROUP BY geo_country
    ORDER BY visitors DESC
    LIMIT 5
  `
  return rows
}

async function getFunnelData(tenantId: string) {
  if (!sql) return null
  const [visitors, pageViewers, toolUsers, inquiryUsers, leads] = await Promise.all([
    sql`SELECT COUNT(DISTINCT visitor_id)::int as count
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '7 days'`,
    sql`SELECT COUNT(DISTINCT visitor_id)::int as count
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '7 days'
          AND event_type = 'page_view'`,
    sql`SELECT COUNT(DISTINCT visitor_id)::int as count
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '7 days'
          AND action IN ('tool_start', 'tool_complete')`,
    sql`SELECT COUNT(DISTINCT visitor_id)::int as count
        FROM public.inquiries
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '7 days'`,
    sql`SELECT COUNT(*)::int as count
        FROM public.users
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '7 days'`,
  ])
  return {
    visitors: visitors[0]?.count ?? 0,
    pageViewers: pageViewers[0]?.count ?? 0,
    toolUsers: toolUsers[0]?.count ?? 0,
    inquiryUsers: inquiryUsers[0]?.count ?? 0,
    leads: leads[0]?.count ?? 0,
  }
}

async function getInquiryStats(tenantId: string) {
  if (!sql) return null
  const [total, effective, highIntent, pending] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM public.inquiries WHERE tenant_id = ${tenantId} AND created_at > NOW() - INTERVAL '7 days'`,
    sql`SELECT COUNT(*)::int as count FROM public.inquiries WHERE tenant_id = ${tenantId} AND created_at > NOW() - INTERVAL '7 days' AND status IN ('following', 'completed')`,
    sql`SELECT COUNT(*)::int as count FROM public.inquiries WHERE tenant_id = ${tenantId} AND created_at > NOW() - INTERVAL '7 days' AND priority = 'high'`,
    sql`SELECT COUNT(*)::int as count FROM public.inquiries WHERE tenant_id = ${tenantId} AND created_at > NOW() - INTERVAL '7 days' AND status = 'pending'`,
  ])
  return {
    total: total[0]?.count ?? 0,
    effective: effective[0]?.count ?? 0,
    highIntent: highIntent[0]?.count ?? 0,
    pending: pending[0]?.count ?? 0,
  }
}

async function getRfmStats(tenantId: string) {
  if (!sql) return null
  const [total, high, medium, low] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM public.rfm_analysis WHERE tenant_id = ${tenantId}`,
    sql`SELECT COUNT(*)::int as count FROM public.rfm_analysis WHERE tenant_id = ${tenantId} AND rfm_segment IN ('champions', 'loyal', 'at_risk')`,
    sql`SELECT COUNT(*)::int as count FROM public.rfm_analysis WHERE tenant_id = ${tenantId} AND rfm_segment IN ('potential_loyalist', 'promising')`,
    sql`SELECT COUNT(*)::int as count FROM public.rfm_analysis WHERE tenant_id = ${tenantId} AND rfm_segment IN ('lost', 'hibernating', 'cant_lose')`,
  ])
  return {
    total: total[0]?.count ?? 0,
    high: high[0]?.count ?? 0,
    medium: medium[0]?.count ?? 0,
    low: low[0]?.count ?? 0,
  }
}

async function getTopPages(tenantId: string) {
  if (!sql) return null
  const rows = await sql`
    SELECT page_url, COUNT(*)::int as pv
    FROM public.tracking_events
    WHERE tenant_id = ${tenantId}
      AND created_at > NOW() - INTERVAL '7 days'
      AND event_type = 'page_view'
      AND page_url IS NOT NULL
    GROUP BY page_url
    ORDER BY pv DESC
    LIMIT 3
  `
  return rows
}

async function getTrend(tenantId: string) {
  if (!sql) return null
  const rows = await sql`
    SELECT DATE(created_at) as date,
           COUNT(DISTINCT visitor_id)::int as uv,
           COUNT(*)::int as pv
    FROM public.tracking_events
    WHERE tenant_id = ${tenantId}
      AND created_at > NOW() - INTERVAL '14 days'
      AND event_type = 'page_view'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
    LIMIT 14
  `

  if (rows.length < 2) return null

  const first = rows.slice(0, Math.ceil(rows.length / 2))
  const second = rows.slice(Math.ceil(rows.length / 2))

  const avgFirst = first.reduce((s, r) => s + Number(r.uv), 0) / first.length
  const avgSecond = second.reduce((s, r) => s + Number(r.uv), 0) / second.length

  const change = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0

  return { change: Math.round(change), direction: change >= 0 ? 'up' : 'down' }
}

function calcChange(curr: number, prev: number): string {
  if (prev === 0) return curr > 0 ? `+${formatNumber(curr)}%` : '0%'
  const change = ((curr - prev) / prev) * 100
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

async function generateResponse(message: string, tenantId: string): Promise<{ response: string; speak: boolean; data?: unknown }> {
  const lower = message.toLowerCase()

  // === 今日数据 ===
  if (lower.includes('今天') || lower.includes('今日') || lower.includes('today')) {
    const [today, yesterday, trend] = await Promise.all([
      getTodayStats(tenantId),
      getYesterdayStats(tenantId),
      getTrend(tenantId),
    ])
    if (!today) return { response: '数据库未配置，无法查询数据。', speak: false }
    const uvChange = calcChange(today.uv, yesterday?.uv ?? 0)
    const trendText = trend ? `，较上周${trend.direction === 'up' ? '增长' : '下降'}${Math.abs(trend.change)}%` : ''
    return {
      response: `今日数据概况：访客数 ${formatNumber(today.uv)} 人（${uvChange}），浏览量 ${formatNumber(today.pv)} 次，会话 ${formatNumber(today.sessions)} 次，工具使用 ${formatNumber(today.toolCount)} 次，询盘 ${formatNumber(today.inquiries)} 条${trendText}。`,
      speak: true,
      data: today,
    }
  }

  // === 昨日数据 ===
  if (lower.includes('昨天') || lower.includes('昨日')) {
    const yesterday = await getYesterdayStats(tenantId)
    if (!yesterday) return { response: '数据库未配置，无法查询数据。', speak: false }
    return {
      response: `昨日数据：访客数 ${formatNumber(yesterday.uv)} 人，浏览量 ${formatNumber(yesterday.pv)} 次，会话 ${formatNumber(yesterday.sessions)} 次，工具用户 ${formatNumber(yesterday.toolUsers)} 人，询盘 ${formatNumber(yesterday.inquiries)} 条。`,
      speak: false,
      data: yesterday,
    }
  }

  // === 本周数据 ===
  if (lower.includes('本周') || lower.includes('这周') || (lower.includes('这') && lower.includes('周'))) {
    const [week, prevWeek] = await Promise.all([
      getWeekStats(tenantId),
      (async () => {
        if (!sql) return null
        return await sql`SELECT COUNT(DISTINCT visitor_id)::int as uv
            FROM public.tracking_events WHERE tenant_id = ${tenantId}
            AND created_at > NOW() - INTERVAL '14 days'
            AND created_at <= NOW() - INTERVAL '7 days'
            AND event_type = 'page_view'`
      })(),
    ])
    if (!week) return { response: '数据库未配置，无法查询数据。', speak: false }
    const uvChange = calcChange(week.uv, prevWeek?.[0]?.uv ?? 0)
    const conversion = week.uv > 0 ? ((week.inquiries / week.uv) * 100).toFixed(1) : '0.0'
    return {
      response: `本周数据：总访客数 ${formatNumber(week.uv)} 人（${uvChange}），总浏览量 ${formatNumber(week.pv)} 次，转化率 ${conversion}%，工具用户 ${formatNumber(week.toolUsers)} 人，新增询盘 ${formatNumber(week.inquiries)} 条，新增线索 ${formatNumber(week.leads)} 条。`,
      speak: true,
      data: week,
    }
  }

  // === 本月数据 ===
  if (lower.includes('本月') || lower.includes('这个月') || (lower.includes('这') && lower.includes('月'))) {
    const month = await getMonthStats(tenantId)
    if (!month) return { response: '数据库未配置，无法查询数据。', speak: false }
    const conversion = month.uv > 0 ? ((month.inquiries / month.uv) * 100).toFixed(1) : '0.0'
    return {
      response: `本月数据：总访客数 ${formatNumber(month.uv)} 人，总浏览量 ${formatNumber(month.pv)} 次，转化率 ${conversion}%，工具用户 ${formatNumber(month.toolUsers)} 人，询盘总数 ${formatNumber(month.inquiries)} 条（已完成 ${formatNumber(month.completed)} 条，待处理 ${formatNumber(month.pending)} 条），线索 ${formatNumber(month.leads)} 条。`,
      speak: true,
      data: month,
    }
  }

  // === 流量分析 ===
  if (lower.includes('流量') || lower.includes('访客')) {
    const [sources, geo] = await Promise.all([getTrafficSources(tenantId), getGeoDistribution(tenantId)])
    if (!sources) return { response: '数据库未配置，无法查询数据。', speak: false }
    const sourceText = sources.length > 0
      ? sources.map((r, i) => `${r.traffic_source}（${Math.round((Number(r.visitors) / (sources.reduce((s, x) => s + Number(x.visitors), 0) || 1)) * 100)}%）`).join('、')
      : '暂无数据'
    const geoText = geo && geo.length > 0
      ? geo.map((r, i) => `${r.geo_country}`).join('、')
      : '暂无数据'
    return {
      response: `流量分析：主要流量来源依次为 ${sourceText}。访客地区分布前五：${geoText}。`,
      speak: false,
      data: { sources, geo },
    }
  }

  // === 地区分布 ===
  if (lower.includes('来源') || lower.includes('地区') || lower.includes('国家')) {
    const geo = await getGeoDistribution(tenantId)
    if (!geo) return { response: '数据库未配置，无法查询数据。', speak: false }
    const total = geo.reduce((s, r) => s + Number(r.visitors), 0) || 1
    const text = geo.map((r) => `${r.geo_country}（${Math.round((Number(r.visitors) / total) * 100)}%）`).join('、')
    return { response: `访客地区分布：${text || '暂无数据'}。`, speak: false, data: geo }
  }

  // === 转化漏斗 ===
  if (lower.includes('转化') || lower.includes('漏斗')) {
    const funnel = await getFunnelData(tenantId)
    if (!funnel) return { response: '数据库未配置，无法查询数据。', speak: false }
    const step1 = funnel.visitors || 1
    const step2 = funnel.pageViewers
    const step3 = funnel.toolUsers
    const step4 = funnel.inquiryUsers
    return {
      response: `转化漏斗分析：访问 ${formatNumber(step1)} 人 → 浏览页面 ${formatNumber(step2)} 人（${formatPercent((step2 / step1) * 100)}）→ 使用工具 ${formatNumber(step3)} 人（${formatPercent((step3 / step1) * 100)}）→ 提交询盘 ${formatNumber(step4)} 人（${formatPercent((step4 / step1) * 100)}）→ 最终转化 ${formatPercent((step4 / step1) * 100)}。`,
      speak: true,
      data: funnel,
    }
  }

  // === 询盘统计 ===
  if (lower.includes('询盘') || lower.includes('inquiry')) {
    const [inquiries, month] = await Promise.all([getInquiryStats(tenantId), getMonthStats(tenantId)])
    if (!inquiries) return { response: '数据库未配置，无法查询数据。', speak: false }
    const effective = month?.inquiries ? ((inquiries.effective / month.inquiries) * 100).toFixed(1) : '0.0'
    return {
      response: `询盘统计：本周新增询盘 ${formatNumber(inquiries.total)} 条，其中有效询盘 ${formatNumber(inquiries.effective)} 条（占比 ${effective}%），高意向询盘 ${formatNumber(inquiries.highIntent)} 条，待处理 ${formatNumber(inquiries.pending)} 条。`,
      speak: false,
      data: inquiries,
    }
  }

  // === 线索统计 ===
  if (lower.includes('线索') || lower.includes('lead')) {
    const week = await getWeekStats(tenantId)
    if (!week) return { response: '数据库未配置，无法查询数据。', speak: false }
    const rate = week.uv > 0 ? ((week.leads / week.uv) * 100).toFixed(1) : '0.0'
    return {
      response: `线索统计：本周新增线索 ${formatNumber(week.leads)} 条，线索转化率为 ${rate}%。`,
      speak: false,
      data: { leads: week.leads, uv: week.uv },
    }
  }

  // === RFM 分析 ===
  if (lower.includes('rfm') || lower.includes('客户价值') || lower.includes('用户分层')) {
    const rfm = await getRfmStats(tenantId)
    if (!rfm) return { response: '数据库未配置，无法查询数据。', speak: false }
    if (rfm.total === 0) return { response: 'RFM 分析暂无数据，请确保数据采集时间足够长。', speak: false }
    const total = rfm.total || 1
    return {
      response: `RFM 分析结果：高价值客户 ${formatNumber(rfm.high)} 人（占比 ${formatPercent((rfm.high / total) * 100)}），中等价值客户 ${formatNumber(rfm.medium)} 人（${formatPercent((rfm.medium / total) * 100)}），低价值客户 ${formatNumber(rfm.low)} 人（${formatPercent((rfm.low / total) * 100)}）。`,
      speak: true,
      data: rfm,
    }
  }

  // === 热门页面 ===
  if (lower.includes('内容') || lower.includes('热度') || lower.includes('页面') || lower.includes('page')) {
    const pages = await getTopPages(tenantId)
    if (!pages) return { response: '数据库未配置，无法查询数据。', speak: false }
    const text = pages.map((p, i) => `"${p.page_url}"（${formatNumber(Number(p.pv))}次）`).join('、')
    return { response: `热门页面：${text || '暂无数据'}。`, speak: false, data: pages }
  }

  // === 趋势分析 ===
  if (lower.includes('增长') || lower.includes('下降') || lower.includes('变化') || lower.includes('趋势')) {
    const trend = await getTrend(tenantId)
    if (!trend) return { response: '数据不足，无法计算趋势（需要至少2周数据）。', speak: true }
    const direction = trend.direction === 'up' ? '增长' : '下降'
    return {
      response: `访客趋势：最近7天较之前7天${direction} ${Math.abs(trend.change)}%，整体呈${trend.direction === 'up' ? '上升' : '下降'}趋势。`,
      speak: true,
      data: trend,
    }
  }

  // === 对比分析 ===
  if (lower.includes('对比') || lower.includes('比较')) {
    const [today, yesterday] = await Promise.all([getTodayStats(tenantId), getYesterdayStats(tenantId)])
    if (!today) return { response: '数据库未配置，无法查询数据。', speak: true }
    const uvChange = calcChange(today.uv, yesterday?.uv ?? 0)
    const pvChange = calcChange(today.pv, yesterday?.pv ?? 0)
    const inqChange = calcChange(today.inquiries, yesterday?.inquiries ?? 0)
    return {
      response: `数据对比：今日与昨日相比，访客数${uvChange}，浏览量${pvChange}，询盘数${inqChange}。`,
      speak: true,
      data: { today, yesterday },
    }
  }

  // === 帮助 ===
  if (lower.includes('帮助') || lower.includes('能做什么')) {
    return {
      response: '我可以帮您查询各类真实数据，包括：今日/本周/本月概况、流量来源、访客地区分布、转化漏斗分析、询盘统计、线索统计、RFM 客户分层、热门页面、趋势变化。您可以用自然语言提问，例如："今天访客多少？"、"本周转化率怎么样？"、"本月询盘情况如何？"',
      speak: false,
    }
  }

  // === 默认 ===
  return {
    response: `我理解您想了解数据，但您可以更具体地提问。我支持查询：今日/本周/本月数据、流量来源、地区分布、转化漏斗、询盘线索统计、RFM 分层、热门页面、趋势变化。例如："今天访客多少？"、"本周询盘情况如何？"`,
    speak: false,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, tenant } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!isDbConfigured || !sql) {
      return NextResponse.json(
        { response: '数据库未配置，无法回答数据问题。', speak: false },
        { status: 200 }
      )
    }

    const tenantSlug = tenant || 'zxqconsulting'
    const tenantId = await getTenantIdBySlug(tenantSlug)

    if (!tenantId) {
      return NextResponse.json(
        { response: `未找到租户 "${tenantSlug}"，请确认租户名称正确。`, speak: false },
        { status: 200 }
      )
    }

    const result = await generateResponse(message, tenantId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[AI-Assistant] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'AI Assistant API is running — Real Database Query Mode',
    capabilities: [
      '今日/本周/本月数据查询（真实数据库）',
      '趋势分析（增长、下降、对比）',
      '流量来源分布',
      '访客地区分布',
      '转化漏斗分析',
      '询盘和线索统计',
      'RFM 客户分层',
      '热门页面排行',
    ],
  })
}
