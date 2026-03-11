/**
 * 访客分析数据 API - 设备、地理位置、流量来源
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
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

  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const days = Math.min(Number(searchParams.get('days') ?? 30), 90)
    const since = new Date()
    since.setDate(since.getDate() - days)

    // 1. 设备类型分析
    const deviceStats = await sql`
      SELECT 
        COALESCE(device_type, 'unknown') AS device_type,
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(*) AS page_views
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${since.toISOString()}
      GROUP BY device_type
      ORDER BY visitors DESC
    `

    // 2. 浏览器分析
    const browserStats = await sql`
      SELECT 
        COALESCE(browser, 'unknown') AS browser,
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(*) AS page_views
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${since.toISOString()}
      GROUP BY browser
      ORDER BY visitors DESC
      LIMIT 10
    `

    // 3. 操作系统分析
    const osStats = await sql`
      SELECT 
        COALESCE(os, 'unknown') AS os,
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(*) AS page_views
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${since.toISOString()}
      GROUP BY os
      ORDER BY visitors DESC
    `

    // 4. 地理位置 - 国家
    const countryStats = await sql`
      SELECT 
        COALESCE(geo_country, 'unknown') AS country,
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(*) AS page_views
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${since.toISOString()}
      GROUP BY geo_country
      ORDER BY visitors DESC
    `

    // 5. 地理位置 - 城市
    const cityStats = await sql`
      SELECT 
        COALESCE(geo_city, 'unknown') AS city,
        COALESCE(geo_country, 'unknown') AS country,
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(*) AS page_views
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${since.toISOString()}
        AND geo_city IS NOT NULL
      GROUP BY geo_city, geo_country
      ORDER BY visitors DESC
      LIMIT 15
    `

    // 6. 流量来源
    const trafficSourceStats = await sql`
      SELECT 
        COALESCE(traffic_source, 'direct') AS traffic_source,
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(*) AS page_views
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${since.toISOString()}
      GROUP BY traffic_source
      ORDER BY visitors DESC
    `

    // 7. 语言
    const languageStats = await sql`
      SELECT 
        COALESCE(language, 'unknown') AS language,
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(*) AS page_views
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${since.toISOString()}
      GROUP BY language
      ORDER BY visitors DESC
      LIMIT 10
    `

    // 8. 总览统计
    const totalStats = await sql`
      SELECT 
        COUNT(DISTINCT visitor_id) AS total_visitors,
        COUNT(DISTINCT session_id) AS total_sessions,
        COUNT(*) AS total_events
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${since.toISOString()}
    `

    return NextResponse.json({
      summary: {
        totalVisitors: Number(totalStats[0]?.total_visitors || 0),
        totalSessions: Number(totalStats[0]?.total_sessions || 0),
        totalEvents: Number(totalStats[0]?.total_events || 0),
      },
      devices: deviceStats.map(r => ({
        type: r.device_type,
        visitors: Number(r.visitors),
        pageViews: Number(r.page_views),
      })),
      browsers: browserStats.map(r => ({
        name: r.browser,
        visitors: Number(r.visitors),
        pageViews: Number(r.page_views),
      })),
      operatingSystems: osStats.map(r => ({
        name: r.os,
        visitors: Number(r.visitors),
        pageViews: Number(r.page_views),
      })),
      countries: countryStats.map(r => ({
        name: r.country,
        visitors: Number(r.visitors),
        pageViews: Number(r.page_views),
      })),
      cities: cityStats.map(r => ({
        name: r.city,
        country: r.country,
        visitors: Number(r.visitors),
        pageViews: Number(r.page_views),
      })),
      trafficSources: trafficSourceStats.map(r => ({
        source: r.traffic_source,
        visitors: Number(r.visitors),
        pageViews: Number(r.page_views),
      })),
      languages: languageStats.map(r => ({
        name: r.language,
        visitors: Number(r.visitors),
        pageViews: Number(r.page_views),
      })),
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
