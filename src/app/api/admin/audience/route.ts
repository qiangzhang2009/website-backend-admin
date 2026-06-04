/**
 * 访客分析数据 API - 设备、地理位置、流量来源
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'
import { COUNTRY_MAPPING } from '@/lib/constants'
import { normalizeCountryName } from '@/lib/geo-normalize'

// 标准化国家名称（支持分号分隔的多国家名，如 "德国;德國"）
function normalizeCountry(country: string | null): string {
  if (!country) return '未知'
  if (country.includes(';')) {
    return country.split(';').map(normalizeCountry).join(';')
  }
  const normalized = country.toString().toLowerCase().trim()
  return COUNTRY_MAPPING[normalized] || COUNTRY_MAPPING[country] || country
}

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
      countries: (() => {
        const countryMap = new Map<string, { visitors: number; pageViews: number }>()
        for (const r of countryStats) {
          const name = normalizeCountry(r.country)
          const existing = countryMap.get(name) || { visitors: 0, pageViews: 0 }
          existing.visitors += Number(r.visitors)
          existing.pageViews += Number(r.pageViews)
          countryMap.set(name, existing)
        }
        return Array.from(countryMap.entries())
          .map(([name, stats]) => ({ name, visitors: stats.visitors, pageViews: stats.pageViews }))
          .sort((a, b) => b.visitors - a.visitors)
      })(),
      cities: (() => {
        const cityMap = new Map<string, { country: string; visitors: number; pageViews: number }>()
        for (const r of cityStats) {
          const normalizedCountry = normalizeCountry(r.country)
          const key = `${r.city}|${normalizedCountry}`
          const existing = cityMap.get(key) || { country: normalizedCountry, visitors: 0, pageViews: 0 }
          existing.visitors += Number(r.visitors)
          existing.pageViews += Number(r.pageViews)
          cityMap.set(key, existing)
        }
        return Array.from(cityMap.entries())
          .map(([key, stats]) => ({ name: key.split('|')[0], country: stats.country, visitors: stats.visitors, pageViews: stats.pageViews }))
          .sort((a, b) => b.visitors - a.visitors)
          .slice(0, 15)
      })(),
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
