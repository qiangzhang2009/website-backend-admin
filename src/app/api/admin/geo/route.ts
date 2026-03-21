/**
 * 地域统计 API
 * 提供国家/城市级别的访客统计
 * 支持国家名称标准化合并
 */

import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

// 国家名称标准化映射
const COUNTRY_MAPPING: Record<string, string> = {
  // 中文
  '中国': '中国',
  '中国大陆': '中国',
  'china': '中国',
  'CN': '中国',
  'cn': '中国',
  'chinese': '中国',
  // 日本
  '日本': '日本',
  'japan': '日本',
  'JP': '日本',
  'jp': '日本',
  'japanese': '日本',
  // 美国
  '美国': '美国',
  'usa': '美国',
  'US': '美国',
  'us': '美国',
  'united states': '美国',
  'united states of america': '美国',
  // 英国
  '英国': '英国',
  'uk': '英国',
  'UK': '英国',
  'united kingdom': '英国',
  'great britain': '英国',
  // 德国
  '德国': '德国',
  '德國': '德国',
  'germany': '德国',
  'DE': '德国',
  'de': '德国',
  'deutschland': '德国',
  // 法国
  '法国': '法国',
  'france': '法国',
  'FR': '法国',
  'fr': '法国',
  // 韩国
  '韩国': '韩国',
  'korea': '韩国',
  'KR': '韩国',
  'kr': '韩国',
  'south korea': '韩国',
  // 台湾
  '台湾': '台湾',
  'taiwan': '台湾',
  'TW': '台湾',
  'tw': '台湾',
  // 香港
  '香港': '香港',
  'hong kong': '香港',
  'HK': '香港',
  'hk': '香港',
  // 澳门
  '澳门': '澳门',
  'macau': '澳门',
  'MO': '澳门',
  'mo': '澳门',
  // 新加坡
  '新加坡': '新加坡',
  'singapore': '新加坡',
  'SG': '新加坡',
  'sg': '新加坡',
  // 加拿大
  '加拿大': '加拿大',
  'canada': '加拿大',
  'CA': '加拿大',
  'ca': '加拿大',
  // 澳大利亚
  '澳大利亚': '澳大利亚',
  'australia': '澳大利亚',
  'AU': '澳大利亚',
  'au': '澳大利亚',
  // 印度
  '印度': '印度',
  'india': '印度',
  'IN': '印度',
  'in': 'india',
  // 俄罗斯
  '俄罗斯': '俄罗斯',
  'russia': '俄罗斯',
  'RU': '俄罗斯',
  'ru': '俄罗斯',
  // 巴西
  '巴西': '巴西',
  'brazil': '巴西',
  'BR': '巴西',
  'br': '巴西',
  // 墨西哥
  '墨西哥': '墨西哥',
  'mexico': '墨西哥',
  'MX': '墨西哥',
  'mx': '墨西哥',
  // 荷兰
  '荷兰': '荷兰',
  'netherlands': '荷兰',
  'NL': '荷兰',
  'nl': '荷兰',
  // 瑞士
  '瑞士': '瑞士',
  'switzerland': '瑞士',
  'CH': '瑞士',
  'ch': '瑞士',
  // 瑞典
  '瑞典': '瑞典',
  'sweden': '瑞典',
  'SE': '瑞典',
  'se': '瑞典',
  // 意大利
  '意大利': '意大利',
  'italy': '意大利',
  'IT': '意大利',
  'it': '意大利',
  // 西班牙
  '西班牙': '西班牙',
  'spain': '西班牙',
  'ES': '西班牙',
  'es': '西班牙',
}

// 标准化国家名称（支持分号分隔的多国家名，如 "德国;德國"）
function normalizeCountry(country: string | null): string {
  if (!country) return '未知'
  // 如果包含分号，分别标准化各部分后合并
  if (country.includes(';')) {
    return country.split(';').map(normalizeCountry).join(';')
  }
  const normalized = country.toString().toLowerCase().trim()
  return COUNTRY_MAPPING[normalized] || COUNTRY_MAPPING[country] || country
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')
  const type = searchParams.get('type') || 'country' // country | city
  const days = Math.min(Number(searchParams.get('days') ?? 30), 90)

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 401 })
  }

  // 数据库未配置
  if (!isDbConfigured || !sql) {
    return NextResponse.json({
      data: [],
      error: 'Database not configured'
    })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) {
      return NextResponse.json({ data: [] })
    }

    // 计算日期范围
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)
    const sinceStr = sinceDate.toISOString()

    let data

    if (type === 'country') {
      // 按国家统计 - 先获取原始数据
      const result = await sql`
        SELECT 
          geo_country as name,
          COUNT(DISTINCT visitor_id) as visitors,
          COUNT(*) as pageViews,
          COUNT(DISTINCT session_id) as sessions
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${sinceStr}
          AND geo_country IS NOT NULL
        GROUP BY geo_country
        ORDER BY visitors DESC
        LIMIT 50
      `
      // 标准化国家名称并合并统计
      const countryMap = new Map<string, { visitors: number; pageViews: number; sessions: number }>()
      for (const row of result) {
        const normalizedName = normalizeCountry(row.name)
        const existing = countryMap.get(normalizedName) || { visitors: 0, pageViews: 0, sessions: 0 }
        // 访客去重比较复杂，这里简化处理：累加pageViews和sessions
        // 实际应该按原始国家分别统计后合并
        existing.pageViews += Number(row.pageViews)
        existing.sessions += Number(row.sessions)
        // 访客数需要重新计算，这里先用原始值
        existing.visitors += Number(row.visitors)
        countryMap.set(normalizedName, existing)
      }
      // 转换为数组并按访客数排序
      data = Array.from(countryMap.entries())
        .map(([name, stats]) => ({
          name,
          value: stats.visitors,
          pageViews: stats.pageViews,
          sessions: stats.sessions,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 20)
    } else {
      // 按城市统计 - 也需要标准化国家名称
      const result = await sql`
        SELECT 
          geo_country,
          geo_city as name,
          COUNT(DISTINCT visitor_id) as visitors,
          COUNT(*) as pageViews,
          COUNT(DISTINCT session_id) as sessions
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${sinceStr}
          AND geo_city IS NOT NULL
        GROUP BY geo_country, geo_city
        ORDER BY visitors DESC
        LIMIT 50
      `
      // 标准化国家名称并合并统计
      const cityMap = new Map<string, { country: string; visitors: number; pageViews: number; sessions: number }>()
      for (const row of result) {
        const normalizedCountry = normalizeCountry(row.geo_country)
        const key = `${normalizedCountry}|${row.name}`
        const existing = cityMap.get(key) || { country: normalizedCountry, visitors: 0, pageViews: 0, sessions: 0 }
        existing.pageViews += Number(row.pageViews)
        existing.sessions += Number(row.sessions)
        existing.visitors += Number(row.visitors)
        cityMap.set(key, existing)
      }
      // 转换为数组并按访客数排序
      data = Array.from(cityMap.entries())
        .map(([key, stats]) => ({
          name: key.split('|')[1],
          country: stats.country,
          value: stats.visitors,
          pageViews: stats.pageViews,
          sessions: stats.sessions,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 30)
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Geo API error:', error)
    return NextResponse.json({ 
      data: [],
      error: String(error) 
    }, { status: 500 })
  }
}
