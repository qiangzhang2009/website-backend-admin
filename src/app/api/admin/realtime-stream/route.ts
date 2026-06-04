/**
 * 实时数据 SSE（Server-Sent Events）端点
 * 使用 SSE 替代轮询，减少服务器负载，支持多客户端实时推送
 *
 * 使用方式:
 *   const es = new EventSource('/api/admin/realtime-stream?tenant=zxqconsulting')
 *   es.addEventListener('update', (e) => {
 *     const data = JSON.parse(e.data)
 *     console.log('Realtime update:', data)
 *   })
 */

import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export const runtime = 'edge'

// 国家名称标准化
const COUNTRY_MAPPING: Record<string, string> = {
  'china': '中国', 'cn': '中国', '中国': '中国',
  'japan': '日本', 'jp': '日本', '日本': '日本',
  'usa': '美国', 'us': '美国', 'united states': '美国',
  'united kingdom': '英国', 'uk': '英国',
  'germany': '德国', 'de': '德国',
  'france': '法国', 'fr': '法国',
  'korea': '韩国', 'kr': '韩国',
  'taiwan': '台湾', 'tw': '台湾',
  'hong kong': '香港', 'hk': '香港',
  'singapore': '新加坡', 'sg': '新加坡',
  'canada': '加拿大', 'ca': '加拿大',
  'australia': '澳大利亚', 'au': '澳大利亚',
}

function normalizeCountry(country: string | null | undefined): string {
  if (!country) return ''
  const normalized = country.toLowerCase().trim()
  return COUNTRY_MAPPING[normalized] || country
}

async function fetchRealtimeData(tenantId: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const last30min = new Date(now.getTime() - 30 * 60 * 1000)

  const [
    todayVisitors,
    todayPageViews,
    todayTools,
    todayInquiries,
    activeVisitorsResult,
    recentEvents,
  ] = await Promise.all([
    sql!`SELECT COUNT(DISTINCT visitor_id)::int as count FROM public.tracking_events WHERE tenant_id = ${tenantId} AND created_at >= ${today.toISOString()}`,
    sql!`SELECT COUNT(*)::int as count FROM public.tracking_events WHERE tenant_id = ${tenantId} AND event_type = 'page_view' AND created_at >= ${today.toISOString()}`,
    sql!`SELECT COUNT(*)::int as count FROM public.tool_interactions WHERE tenant_id = ${tenantId} AND created_at >= ${today.toISOString()}`,
    sql!`SELECT COUNT(*)::int as count FROM public.inquiries WHERE tenant_id = ${tenantId} AND created_at >= ${today.toISOString()}`,
    sql!`SELECT COUNT(DISTINCT visitor_id)::int as count FROM public.tracking_events WHERE tenant_id = ${tenantId} AND created_at >= ${last30min.toISOString()}`,
    sql!`SELECT event_type, page_title, visitor_id, created_at, geo_country, traffic_source FROM public.tracking_events WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 10`,
  ])

  const engagedResult = await sql!`SELECT COUNT(DISTINCT visitor_id)::int as count FROM public.tracking_events WHERE tenant_id = ${tenantId} AND created_at >= ${today.toISOString()} AND event_type = 'page_view' GROUP BY visitor_id HAVING COUNT(*) > 3`

  const toolUsersResult = await sql!`SELECT COUNT(DISTINCT visitor_id)::int as count FROM public.tool_interactions WHERE tenant_id = ${tenantId} AND created_at >= ${today.toISOString()}`

  const todayEngaged = engagedResult.length
  const todayToolUsers = Number(toolUsersResult[0]?.count ?? 0)
  const uv = Number(todayVisitors[0]?.count ?? 0)
  const pv = Number(todayPageViews[0]?.count ?? 0)

  return {
    timestamp: now.toISOString(),
    summary: {
      todayVisitors: uv,
      todayPageViews: pv,
      todayTools: Number(todayTools[0]?.count ?? 0),
      todayInquiries: Number(todayInquiries[0]?.count ?? 0),
      todayEngaged,
      todayToolUsers,
      activeVisitors: Number(activeVisitorsResult[0]?.count ?? 0),
    },
    metrics: {
      engagementRate: uv > 0 ? Math.round((todayEngaged / uv) * 100) : 0,
      toolUsageRate: uv > 0 ? Math.round((todayToolUsers / uv) * 100) : 0,
      conversionRate: uv > 0 ? Math.round((Number(todayInquiries[0]?.count ?? 0) / uv) * 10000) / 100 : 0,
      avgPageViewsPerVisitor: uv > 0 ? Math.round((pv / uv) * 10) / 10 : 0,
    },
    recentEvents: recentEvents.map((r: Record<string, unknown>) => ({
      type: r.event_type,
      page: r.page_title,
      visitor: String(r.visitor_id ?? '').substring(0, 12) + '...',
      time: r.created_at,
      country: normalizeCountry(String(r.geo_country ?? '')),
      source: r.traffic_source,
    })),
    realtime: {
      activeVisitors: Number(activeVisitorsResult[0]?.count ?? 0),
      lastUpdate: now.toISOString(),
      status: 'online',
    },
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'zxqconsulting'

  if (!isDbConfigured || !sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // SSE 流式响应
  const encoder = new TextEncoder()
  let intervalId: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        try {
          const data = await fetchRealtimeData(tenantId)
          const payload = `event: update\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(payload))
        } catch (err) {
          console.error('[SSE] Fetch error:', err)
        }
      }

      // 立即发送一次
      await sendUpdate()

      // 每 10 秒推送一次（SSE 推荐间隔，不要太频繁）
      intervalId = setInterval(sendUpdate, 10000)

      // 每 55 秒发送一次心跳，保持连接活跃
      const heartbeatId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          // 连接已关闭
        }
      }, 55000)

      request.signal.addEventListener('abort', () => {
        if (intervalId) clearInterval(intervalId)
        clearInterval(heartbeatId)
        try { controller.close() } catch { /* already closed */ }
      })
    },
    cancel() {
      if (intervalId) clearInterval(intervalId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
