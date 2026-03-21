/**
 * 数据概览 API - 稳定版
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')
  const days = Math.min(Number(searchParams.get('days') ?? 7), 90)

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 401 })
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString()

    // 今日开始时间 (使用 UTC+8 时区，中国时区)
    const today = new Date()
    const offset = today.getTimezoneOffset() * 60000 + 8 * 3600000
    const todayLocal = new Date(today.getTime() + offset)
    todayLocal.setHours(0, 0, 0, 0)
    const todayStr = todayLocal.toISOString()

    // 简化查询 - 直接用 COUNT
    let totalVisitors = 0
    let totalPageViews = 0
    let totalSessions = 0
    let avgDuration = 0
    let bounceRate = 0
    let avgPagesPerSession = 0
    let conversionRate = 0

    // 今日数据
    let todayVisitors = 0
    let todayPageViews = 0
    let todaySessions = 0
    let todayInquiries = 0

    try {
      // 访客和浏览量 (期间)
      const pvRes = await sql`
        SELECT 
          COUNT(DISTINCT visitor_id) as uv,
          COUNT(*) as pv
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND event_type = 'page_view'
          AND created_at >= ${sinceStr}
      `
      totalVisitors = Number(pvRes[0]?.uv || 0)
      totalPageViews = Number(pvRes[0]?.pv || 0)
    } catch (e) {
      console.error('Query 1 error:', e)
    }

    try {
      // 今日访客和浏览量
      const todayPvRes = await sql`
        SELECT 
          COUNT(DISTINCT visitor_id) as uv,
          COUNT(*) as pv
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND event_type = 'page_view'
          AND created_at >= ${todayStr}
      `
      todayVisitors = Number(todayPvRes[0]?.uv || 0)
      todayPageViews = Number(todayPvRes[0]?.pv || 0)
    } catch (e) {
      console.error('Query 1a error:', e)
    }

    try {
      // 会话数 (期间)
      const sessionRes = await sql`
        SELECT COUNT(DISTINCT session_id) as sessions
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${sinceStr}
      `
      totalSessions = Number(sessionRes[0]?.sessions || 0)
    } catch (e) {
      console.error('Query 2 error:', e)
    }

    try {
      // 今日会话数
      const todaySessionRes = await sql`
        SELECT COUNT(DISTINCT session_id) as sessions
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${todayStr}
      `
      todaySessions = Number(todaySessionRes[0]?.sessions || 0)
    } catch (e) {
      console.error('Query 2a error:', e)
    }

    try {
      // 平均时长
      const durRes = await sql`
        SELECT AVG(duration_seconds) as avg_dur
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${sinceStr}
          AND duration_seconds IS NOT NULL
      `
      avgDuration = Math.round(Number(durRes[0]?.avg_dur || 0))
    } catch (e) {
      console.error('Query 3 error:', e)
    }

    try {
      // 跳出率
      const bounceRes = await sql`
        SELECT 
          COUNT(CASE WHEN pv = 1 THEN 1 END) as bounced,
          COUNT(*) as total
        FROM (
          SELECT session_id, COUNT(*) as pv
          FROM public.tracking_events
          WHERE tenant_id = ${tenantId}
            AND event_type = 'page_view'
            AND created_at >= ${sinceStr}
          GROUP BY session_id
        ) t
      `
      const bounced = Number(bounceRes[0]?.bounced || 0)
      const totalSess = Number(bounceRes[0]?.total || 1)
      bounceRate = totalSess > 0 ? Math.round((bounced / totalSess) * 1000) / 10 : 0
    } catch (e) {
      console.error('Query 4 error:', e)
    }

    try {
      // 转化率 (期间)
      const inquiryRes = await sql`
        SELECT COUNT(*) as cnt
        FROM public.inquiries
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${sinceStr}
      `
      const inquiryCount = Number(inquiryRes[0]?.cnt || 0)
      conversionRate = totalVisitors > 0 ? Math.round((inquiryCount / totalVisitors) * 10000) / 100 : 0
    } catch (e) {
      console.error('Query 5 error:', e)
    }

    try {
      // 今日咨询数
      const todayInquiryRes = await sql`
        SELECT COUNT(*) as cnt
        FROM public.inquiries
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${todayStr}
      `
      todayInquiries = Number(todayInquiryRes[0]?.cnt || 0)
    } catch (e) {
      console.error('Query 5a error:', e)
    }

    // 计算平均访问深度
    avgPagesPerSession = totalSessions > 0 ? Math.round((totalPageViews / totalSessions) * 10) / 10 : 0

    // ==========================================
    // 昨日数据（用于异常检测对比）
    // ==========================================
    let yesterdayVisitors = 0
    let yesterdayPageViews = 0
    let yesterdayInquiries = 0
    let yesterdayBounceRate = 0

    try {
      const yStart = new Date(todayLocal)
      yStart.setDate(yStart.getDate() - 1)
      const yEnd = new Date(todayLocal)
      const yStartStr = yStart.toISOString()
      const yEndStr = yEnd.toISOString()

      const yPvRes = await sql`
        SELECT 
          COUNT(DISTINCT visitor_id) AS uv,
          COUNT(*) AS pv
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND event_type = 'page_view'
          AND created_at >= ${yStartStr}
          AND created_at < ${yEndStr}
      `
      yesterdayVisitors = Number(yPvRes[0]?.uv || 0)
      yesterdayPageViews = Number(yPvRes[0]?.pv || 0)

      const yBounceRes = await sql`
        SELECT 
          COUNT(CASE WHEN pv = 1 THEN 1 END) as bounced,
          COUNT(*) as total
        FROM (
          SELECT session_id, COUNT(*) as pv
          FROM public.tracking_events
          WHERE tenant_id = ${tenantId}
            AND event_type = 'page_view'
            AND created_at >= ${yStartStr}
            AND created_at < ${yEndStr}
          GROUP BY session_id
        ) t
      `
      const yBounced = Number(yBounceRes[0]?.bounced || 0)
      const yTotal = Number(yBounceRes[0]?.total || 1)
      yesterdayBounceRate = yTotal > 0 ? Math.round((yBounced / yTotal) * 1000) / 10 : 0

      const yInquiryRes = await sql`
        SELECT COUNT(*) AS cnt
        FROM public.inquiries
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${yStartStr}
          AND created_at < ${yEndStr}
      `
      yesterdayInquiries = Number(yInquiryRes[0]?.cnt || 0)
    } catch (e) {
      console.error('Yesterday metrics error:', e)
    }

    return NextResponse.json({
      totalVisitors,
      totalPageViews,
      totalSessions,
      avgDuration,
      bounceRate,
      avgPagesPerSession,
      conversionRate,
      todayVisitors,
      todayPageViews,
      todaySessions,
      todayInquiries,
      yesterdayVisitors,
      yesterdayPageViews,
      yesterdayBounceRate,
      yesterdayInquiries,
    })
  } catch (error) {
    console.error('Overview API error:', error)
    return NextResponse.json({
      totalVisitors: 0,
      totalPageViews: 0,
      totalSessions: 0,
      avgDuration: 0,
      bounceRate: 0,
      avgPagesPerSession: 0,
      conversionRate: 0,
      todayVisitors: 0,
      todayPageViews: 0,
      todaySessions: 0,
      todayInquiries: 0,
    })
  }
}
