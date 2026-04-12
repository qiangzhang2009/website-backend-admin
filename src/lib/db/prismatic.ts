/**
 * Prismatic Analytics 数据库查询函数
 * 支持蒸馏人物追踪数据的查询
 */

import { sql, isDbConfigured } from './index'

// ==================== 类型定义 ====================

export interface OverviewMetrics {
  dau: number
  wau: number
  mau: number
  sessions: number
  avgSessionDuration: number
  totalEvents: number
  totalPersonas: number
  totalConversations: number
  avgConversationsPerVisitor: number
}

export interface PersonaStats {
  persona_id: string
  persona_name: string
  domain: string
  views: number
  conversations: number
  avgTurns: number
  graphClicks: number
  modeBreakdown: { mode: string; count: number }[]
}

export interface FunnelStep {
  name: string
  count: number
  rate: number
}

export interface DailyTrend {
  date: string
  dau: number
  sessions: number
  pageviews: number
  conversations: number
}

export interface DeviceStats {
  device_type: string
  count: number
  percentage: number
}

export interface GeoStats {
  country: string
  subdivision1: string
  city: string
  visitors: number
}

export interface VisitorProfile {
  visitor_id: string
  visit_count: number
  total_duration_seconds: number
  first_visit: string
  last_visit: string
  device_type: string
  country: string
}

// ==================== Overview API ====================

export async function getPrismaticOverview(
  tenantId: string,
  days: number = 7
): Promise<OverviewMetrics> {
  if (!sql) {
    return getMockOverview()
  }

  const since = `NOW() - INTERVAL '${days} days'`

  const [
    dauResult,
    wauResult,
    mauResult,
    sessionsResult,
    totalEventsResult,
    personasResult,
    conversationsResult,
  ] = await Promise.all([
    sql`SELECT COUNT(DISTINCT visitor_id)::int as count
        FROM public.page_events
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '1 day'
          AND event_type = 'pageview'`,
    sql`SELECT COUNT(DISTINCT visitor_id)::int as count
        FROM public.page_events
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '7 days'
          AND event_type = 'pageview'`,
    sql`SELECT COUNT(DISTINCT visitor_id)::int as count
        FROM public.page_events
        WHERE tenant_id = ${tenantId}
          AND created_at > NOW() - INTERVAL '30 days'
          AND event_type = 'pageview'`,
    sql`SELECT COUNT(DISTINCT session_id)::int as count
        FROM public.page_events
        WHERE tenant_id = ${tenantId}
          AND created_at > ${sql.unsafe(since)}`,
    sql`SELECT COUNT(*)::int as count
        FROM public.prismatic_events
        WHERE tenant_id = ${tenantId}
          AND created_at > ${sql.unsafe(since)}`,
    sql`SELECT COUNT(DISTINCT persona_id)::int as count
        FROM public.prismatic_events
        WHERE tenant_id = ${tenantId}
          AND event_type = 'persona_view'
          AND created_at > ${sql.unsafe(since)}`,
    sql`SELECT COUNT(DISTINCT session_id)::int as count
        FROM public.prismatic_events
        WHERE tenant_id = ${tenantId}
          AND event_type = 'chat_start'
          AND created_at > ${sql.unsafe(since)}`,
  ])

  const dau = dauResult[0]?.count ?? 0
  const conversations = conversationsResult[0]?.count ?? 0
  const totalVisitors = mauResult[0]?.count ?? 1

  return {
    dau,
    wau: wauResult[0]?.count ?? 0,
    mau: totalVisitors,
    sessions: sessionsResult[0]?.count ?? 0,
    avgSessionDuration: 0,
    totalEvents: totalEventsResult[0]?.count ?? 0,
    totalPersonas: personasResult[0]?.count ?? 0,
    totalConversations: conversations,
    avgConversationsPerVisitor: conversations > 0 && totalVisitors > 0
      ? parseFloat((conversations / totalVisitors).toFixed(2))
      : 0,
  }
}

// ==================== Persona Stats API ====================

export async function getPrismaticPersonas(
  tenantId: string,
  options: {
    days?: number
    domain?: string
    sort?: string
    order?: 'asc' | 'desc'
    limit?: number
  } = {}
): Promise<PersonaStats[]> {
  if (!sql) return getMockPersonas()

  const { days = 30, domain, sort = 'views', order = 'desc', limit = 50 } = options
  const since = `NOW() - INTERVAL '${days} days'`

  const rows = await sql`
    SELECT
      pe.persona_id,
      pe.persona_name,
      pe.domain,
      COUNT(CASE WHEN pe.event_type = 'persona_view' THEN 1 END)::int as views,
      COUNT(CASE WHEN pe.event_type = 'chat_start' THEN 1 END)::int as conversations,
      COALESCE(
        ROUND(
          AVG(CASE WHEN pe.event_type = 'chat_message' THEN pe.conversation_turn END)::numeric, 1
        ), 0
      ) as avg_turns,
      COUNT(CASE WHEN pe.event_type = 'graph_node_click' THEN 1 END)::int as graph_clicks
    FROM public.prismatic_events pe
    WHERE pe.tenant_id = ${tenantId}
      AND pe.created_at > ${sql.unsafe(since)}
      AND pe.persona_id IS NOT NULL
      ${domain ? sql`AND pe.domain = ${domain}` : sql``}
    GROUP BY pe.persona_id, pe.persona_name, pe.domain
    ORDER BY
      CASE WHEN ${sort} = 'views' AND ${order} = 'desc' THEN COUNT(CASE WHEN pe.event_type = 'persona_view' THEN 1 END) END DESC,
      CASE WHEN ${sort} = 'conversations' AND ${order} = 'desc' THEN COUNT(CASE WHEN pe.event_type = 'chat_start' THEN 1 END) END DESC,
      CASE WHEN ${sort} = 'graph_clicks' AND ${order} = 'desc' THEN COUNT(CASE WHEN pe.event_type = 'graph_node_click' THEN 1 END) END DESC
    LIMIT ${limit}
  `

  return rows.map((r: Record<string, unknown>) => ({
    persona_id: String(r.persona_id),
    persona_name: String(r.persona_name ?? ''),
    domain: String(r.domain ?? ''),
    views: Number(r.views),
    conversations: Number(r.conversations),
    avgTurns: parseFloat(String(r.avg_turns)) || 0,
    graphClicks: Number(r.graph_clicks),
    modeBreakdown: [],
  }))
}

// ==================== Funnel API ====================

export async function getPrismaticFunnel(
  tenantId: string,
  days: number = 30
): Promise<FunnelStep[]> {
  if (!sql) return getMockFunnel()

  const since = `NOW() - INTERVAL '${days} days'`

  const [
    totalVisitors,
    personaViews,
    chatStarts,
    modelExpands,
    graphClicks,
  ] = await Promise.all([
    sql`SELECT COUNT(DISTINCT visitor_id)::int as count
        FROM public.page_events
        WHERE tenant_id = ${tenantId}
          AND event_type = 'pageview'
          AND created_at > ${sql.unsafe(since)}`,
    sql`SELECT COUNT(DISTINCT visitor_id)::int as count
        FROM public.prismatic_events
        WHERE tenant_id = ${tenantId}
          AND event_type = 'persona_view'
          AND created_at > ${sql.unsafe(since)}`,
    sql`SELECT COUNT(DISTINCT visitor_id)::int as count
        FROM public.prismatic_events
        WHERE tenant_id = ${tenantId}
          AND event_type = 'chat_start'
          AND created_at > ${sql.unsafe(since)}`,
    sql`SELECT COUNT(DISTINCT visitor_id)::int as count
        FROM public.prismatic_events
        WHERE tenant_id = ${tenantId}
          AND event_type = 'model_expand'
          AND created_at > ${sql.unsafe(since)}`,
    sql`SELECT COUNT(DISTINCT visitor_id)::int as count
        FROM public.prismatic_events
        WHERE tenant_id = ${tenantId}
          AND event_type = 'graph_node_click'
          AND created_at > ${sql.unsafe(since)}`,
  ])

  const total = totalVisitors[0]?.count || 1

  return [
    { name: '入口页浏览', count: totalVisitors[0]?.count || 0, rate: 100 },
    { name: '人物浏览', count: personaViews[0]?.count || 0, rate: total > 0 ? Math.round((personaViews[0]?.count || 0) / total * 100) : 0 },
    { name: '对话开始', count: chatStarts[0]?.count || 0, rate: total > 0 ? Math.round((chatStarts[0]?.count || 0) / total * 100) : 0 },
    { name: '思维模型展开', count: modelExpands[0]?.count || 0, rate: total > 0 ? Math.round((modelExpands[0]?.count || 0) / total * 100) : 0 },
    { name: '图谱探索', count: graphClicks[0]?.count || 0, rate: total > 0 ? Math.round((graphClicks[0]?.count || 0) / total * 100) : 0 },
  ]
}

// ==================== Daily Trend API ====================

export async function getPrismaticTrend(
  tenantId: string,
  days: number = 7
): Promise<DailyTrend[]> {
  if (!sql) return getMockTrend(days)

  const rows = await sql`
    SELECT
      DATE(created_at) as date,
      COUNT(DISTINCT visitor_id)::int as dau,
      COUNT(DISTINCT session_id)::int as sessions,
      COUNT(CASE WHEN event_type = 'pageview' THEN 1 END)::int as pageviews
    FROM public.page_events
    WHERE tenant_id = ${tenantId}
      AND created_at > NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `

  return rows.map((r: Record<string, unknown>) => ({
    date: String(r.date),
    dau: Number(r.dau),
    sessions: Number(r.sessions),
    pageviews: Number(r.pageviews),
    conversations: 0,
  }))
}

// ==================== Visitor Profile API ====================

export async function getPrismaticVisitorProfiles(
  tenantId: string,
  limit: number = 100
): Promise<VisitorProfile[]> {
  if (!sql) return []

  const rows = await sql`
    SELECT
      visitor_id,
      COUNT(*)::int as visit_count,
      SUM(session_duration_ms)::int / 1000 as total_duration_seconds,
      MIN(created_at) as first_visit,
      MAX(created_at) as last_visit,
      MAX(device_type) as device_type,
      MAX(country) as country
    FROM public.page_events
    WHERE tenant_id = ${tenantId}
      AND visitor_id IS NOT NULL
    GROUP BY visitor_id
    ORDER BY visit_count DESC
    LIMIT ${limit}
  `

  return rows.map((r: Record<string, unknown>) => ({
    visitor_id: String(r.visitor_id),
    visit_count: Number(r.visit_count),
    total_duration_seconds: Number(r.total_duration_seconds) || 0,
    first_visit: String(r.first_visit ?? ''),
    last_visit: String(r.last_visit ?? ''),
    device_type: String(r.device_type ?? 'unknown'),
    country: String(r.country ?? ''),
  }))
}

export async function getPrismaticDeviceStats(
  tenantId: string,
  days: number = 30
): Promise<DeviceStats[]> {
  if (!sql) return []

  const since = `NOW() - INTERVAL '${days} days'`
  const rows = await sql`
    SELECT
      COALESCE(device_type, 'unknown') as device_type,
      COUNT(*)::int as count
    FROM public.page_events
    WHERE tenant_id = ${tenantId}
      AND created_at > ${sql.unsafe(since)}
    GROUP BY device_type
    ORDER BY count DESC
  `

  const total = rows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.count), 0) || 1

  return rows.map((r: Record<string, unknown>) => ({
    device_type: String(r.device_type ?? 'unknown'),
    count: Number(r.count),
    percentage: Math.round((Number(r.count) / total) * 100),
  }))
}

// ==================== Content Health API ====================

export async function getPrismaticContentHealth(
  tenantId: string,
  days: number = 30
): Promise<{ url_path: string; pv: number; uv: number; bounceRate: number; avgScrollDepth: number }[]> {
  if (!sql) return []

  const since = `NOW() - INTERVAL '${days} days'`
  const rows = await sql`
    SELECT
      url_path,
      COUNT(*)::int as pv,
      COUNT(DISTINCT visitor_id)::int as uv,
      ROUND(
        COUNT(CASE WHEN page_count = 1 THEN 1 END)::numeric /
        NULLIF(COUNT(DISTINCT session_id), 0) * 100, 1
      ) as bounce_rate
    FROM public.page_events
    WHERE tenant_id = ${tenantId}
      AND event_type = 'pageview'
      AND url_path IS NOT NULL
      AND created_at > ${sql.unsafe(since)}
    GROUP BY url_path
    ORDER BY pv DESC
    LIMIT 50
  `

  return rows.map((r: Record<string, unknown>) => ({
    url_path: String(r.url_path ?? ''),
    pv: Number(r.pv),
    uv: Number(r.uv),
    bounceRate: parseFloat(String(r.bounce_rate)) || 0,
    avgScrollDepth: 0,
  }))
}

// ==================== 插入事件 ====================

export async function insertPrismaticEvent(data: {
  tenant_id: string
  session_id?: string
  visitor_id?: string
  persona_id?: string
  persona_name?: string
  domain?: string
  event_type: string
  event_data?: Record<string, unknown>
  ai_latency_ms?: number
  model_used?: string
  confidence_score?: number
  conversation_turn?: number
  mode?: string
}) {
  if (!sql) return null

  const rows = await sql`
    INSERT INTO public.prismatic_events
      (tenant_id, session_id, visitor_id, persona_id, persona_name, domain,
       event_type, event_data, ai_latency_ms, model_used, confidence_score,
       conversation_turn, mode, chat_start_time)
    VALUES (
      ${data.tenant_id},
      ${data.session_id ?? null},
      ${data.visitor_id ?? null},
      ${data.persona_id ?? null},
      ${data.persona_name ?? null},
      ${data.domain ?? null},
      ${data.event_type},
      ${JSON.stringify(data.event_data ?? {})},
      ${data.ai_latency_ms ?? null},
      ${data.model_used ?? null},
      ${data.confidence_score ?? null},
      ${data.conversation_turn ?? 0},
      ${data.mode ?? null},
      CASE WHEN ${data.event_type} = 'chat_start' THEN NOW() ELSE NULL END
    )
    RETURNING id
  `
  return rows[0]?.id ?? null
}

export async function upsertSession(data: {
  tenant_id: string
  session_id: string
  visitor_id: string
  browser?: string
  os?: string
  device_type?: string
  country?: string
  subdivision1?: string
  city?: string
  ip_address?: string
}) {
  if (!sql) return null

  const rows = await sql`
    INSERT INTO public.sessions
      (tenant_id, session_id, visitor_id, browser, os, device_type, country, subdivision1, city, ip_address,
       first_visit, last_visit, page_count)
    VALUES (
      ${data.tenant_id}, ${data.session_id}, ${data.visitor_id},
      ${data.browser ?? null}, ${data.os ?? null}, ${data.device_type ?? 'desktop'},
      ${data.country ?? null}, ${data.subdivision1 ?? null}, ${data.city ?? null}, ${data.ip_address ?? null},
      NOW(), NOW(), 1
    )
    ON CONFLICT (session_id)
    DO UPDATE SET
      last_visit = NOW(),
      page_count = sessions.page_count + 1
    RETURNING id
  `
  return rows[0]?.id ?? null
}

export async function insertPageEvent(data: {
  tenant_id: string
  session_id: string
  visitor_id: string
  website_id?: string
  event_type?: string
  url_path?: string
  referrer_domain?: string
  url_query?: string
  browser?: string
  os?: string
  device_type?: string
  country?: string
  subdivision1?: string
  city?: string
  event_data?: Record<string, unknown>
  session_duration_ms?: number
  is_first_visit?: boolean
  is_returning_visit?: boolean
  first_visit_time?: string
  timezone?: string
  traffic_source?: string
  hostname?: string
}) {
  if (!sql) return null

  const rows = await sql`
    INSERT INTO public.page_events
      (tenant_id, session_id, visitor_id, website_id, event_type, url_path,
       referrer_domain, url_query, browser, os, device_type, country, subdivision1, city,
       event_data, session_duration_ms, is_first_visit, is_returning_visit,
       first_visit_time, timezone, traffic_source, hostname)
    VALUES (
      ${data.tenant_id}, ${data.session_id}, ${data.visitor_id},
      ${data.website_id ?? null}, ${data.event_type ?? 'pageview'},
      ${data.url_path ?? null}, ${data.referrer_domain ?? null}, ${data.url_query ?? null},
      ${data.browser ?? null}, ${data.os ?? null}, ${data.device_type ?? 'desktop'},
      ${data.country ?? null}, ${data.subdivision1 ?? null}, ${data.city ?? null},
      ${JSON.stringify(data.event_data ?? {})},
      ${data.session_duration_ms ?? null},
      ${data.is_first_visit ?? false},
      ${data.is_returning_visit ?? false},
      ${data.first_visit_time ?? null},
      ${data.timezone ?? null},
      ${data.traffic_source ?? null},
      ${data.hostname ?? null}
    )
    RETURNING id
  `
  return rows[0]?.id ?? null
}

// ==================== Mock 数据（数据库未配置时使用）====================

function getMockOverview(): OverviewMetrics {
  return {
    dau: 0,
    wau: 0,
    mau: 0,
    sessions: 0,
    avgSessionDuration: 0,
    totalEvents: 0,
    totalPersonas: 0,
    totalConversations: 0,
    avgConversationsPerVisitor: 0,
  }
}

function getMockPersonas(): PersonaStats[] {
  return []
}

function getMockFunnel(): FunnelStep[] {
  return [
    { name: '入口页浏览', count: 0, rate: 100 },
    { name: '人物浏览', count: 0, rate: 0 },
    { name: '对话开始', count: 0, rate: 0 },
    { name: '思维模型展开', count: 0, rate: 0 },
    { name: '图谱探索', count: 0, rate: 0 },
  ]
}

function getMockTrend(days: number): DailyTrend[] {
  const result: DailyTrend[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    result.push({
      date: d.toISOString().split('T')[0],
      dau: 0,
      sessions: 0,
      pageviews: 0,
      conversations: 0,
    })
  }
  return result
}
