/**
 * 访客画像分析 API
 * 基于设备信息、行为数据推断访客属性
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

// 设备品牌与消费能力映射
const DEVICE_BRAND_TIER: Record<string, number> = {
  // 高端品牌 (9-10)
  'iphone': 10, 'ipad': 9, 'mac': 10, 'apple': 10,
  'samsung': 8, 'galaxy': 8,
  'huawei': 7, 'mate': 7, 'p30': 7, 'p40': 7, 'p50': 7, 'p60': 7,
  'pixel': 7, 'google': 7,
  // 中端品牌 (5-7)
  'xiaomi': 6, 'redmi': 5, 'poco': 5,
  'oppo': 6, 'vivo': 6, 'oneplus': 7,
  'realme': 5, 'iqoo': 5,
  // 入门品牌 (1-4)
  'nokia': 3, 'moto': 3, 'lg': 3,
  'tecno': 2, 'infinix': 2, 'itel': 2,
}

// 操作系统与消费能力
const OS_TIER: Record<string, number> = {
  'ios': 9, 'macos': 10,
  'windows': 6, 'android': 5, 'linux': 7,
}

// 浏览器与用户画像
const BROWSER_PROFILE: Record<string, { tier: number; type: string }> = {
  'chrome': { tier: 7, type: 'modern' },
  'safari': { tier: 8, type: 'mainstream' },
  'firefox': { tier: 7, type: 'tech-savvy' },
  'edge': { tier: 6, type: 'business' },
  'opera': { tier: 5, type: 'experienced' },
  'samsung': { tier: 5, type: 'mainstream' },
}

// 国家/地区经济水平
const COUNTRY_TIER: Record<string, number> = {
  // 高消费力 (9-10)
  '中国': 8, 'china': 8, 'cn': 8,
  'united states': 10, 'usa': 10, 'us': 10, '美国': 10,
  'united kingdom': 9, 'uk': 9, '英国': 9,
  'germany': 9, '德国': 9, 'france': 9, '法国': 9, 'switzerland': 10, '瑞士': 10,
  'japan': 9, '日本': 9, 'south korea': 9, '韩国': 9,
  'australia': 9, '澳大利亚': 9, 'canada': 9, '加拿大': 9, 'singapore': 10, '新加坡': 10,
  'netherlands': 9, '荷兰': 9, 'sweden': 9, '瑞典': 9, 'norway': 10,
  'hong kong': 9, '香港': 9, 'taiwan': 8, '台湾': 8,
  // 中等消费力 (6-8)
  'china mainland': 7,
  'malaysia': 7, 'thailand': 6, 'vietnam': 6,
  'india': 5, 'indonesia': 5, 'philippines': 5,
  'brazil': 6, 'mexico': 6, 'russia': 6,
  // 较低消费力 (1-4)
  'pakistan': 3, 'bangladesh': 3, 'nigeria': 3,
  'kenya': 3, 'egypt': 4, 'iran': 3,
}

// 流量来源可信度
const TRAFFIC_SOURCE_SCORE: Record<string, number> = {
  'direct': 7,      // 直接访问 - 已有认知
  'search': 8,      // 搜索引擎 - 有明确需求
  'referral': 6,   // 引荐链接 - 信任推荐
  'social': 4,      // 社交媒体 - 浏览为主
  'email': 9,      // 邮件营销 - 高意向
  'paid': 7,       // 付费广告 - 有预算
}

// 国家名称标准化映射
const COUNTRY_MAPPING: Record<string, string> = {
  '中国': '中国', 'china': '中国', 'CN': '中国', 'cn': '中国', 'chinese': '中国',
  '日本': '日本', 'japan': '日本', 'JP': '日本', 'jp': '日本',
  '美国': '美国', 'usa': '美国', 'US': '美国', 'us': '美国', 'united states': '美国',
  '英国': '英国', 'uk': '英国', 'UK': '英国', 'united kingdom': '英国',
  '德国': '德国', '德國': '德国', 'germany': '德国', 'DE': '德国', 'de': '德国',
  '法国': '法国', 'france': '法国', 'FR': '法国', 'fr': '法国',
  '韩国': '韩国', 'korea': '韩国', 'KR': '韩国', 'kr': '韩国',
  '台湾': '台湾', 'taiwan': '台湾', 'TW': '台湾', 'tw': '台湾',
  '香港': '香港', 'hong kong': '香港', 'HK': '香港', 'hk': '香港',
  '新加坡': '新加坡', 'singapore': '新加坡', 'SG': '新加坡', 'sg': '新加坡',
  '加拿大': '加拿大', 'canada': '加拿大', 'CA': '加拿大', 'ca': '加拿大',
  '澳大利亚': '澳大利亚', 'australia': '澳大利亚', 'AU': '澳大利亚', 'au': '澳大利亚',
  '印度': '印度', 'india': '印度', 'IN': '印度',
  '俄罗斯': '俄罗斯', 'russia': '俄罗斯', 'RU': '俄罗斯', 'ru': '俄罗斯',
  '巴西': '巴西', 'brazil': '巴西', 'BR': '巴西',
  '墨西哥': '墨西哥', 'mexico': '墨西哥', 'MX': '墨西哥',
  '荷兰': '荷兰', 'netherlands': '荷兰', 'NL': '荷兰',
  '瑞士': '瑞士', 'switzerland': '瑞士', 'CH': '瑞士',
  '意大利': '意大利', 'italy': '意大利', 'IT': '意大利',
  '西班牙': '西班牙', 'spain': '西班牙', 'ES': '西班牙',
}

// 标准化国家名称
function normalizeCountry(country: string | null | undefined): string {
  if (!country) return ''
  const normalized = country.toString().toLowerCase().trim()
  return COUNTRY_MAPPING[normalized] || COUNTRY_MAPPING[country] || country
}

interface DeviceInfo {
  brand: string
  tier: number
  isHighEnd: boolean
}

function parseDeviceInfo(userAgent: string, deviceType: string): DeviceInfo {
  const ua = userAgent.toLowerCase()
  
  let brand = 'unknown'
  let tier = 5 // 默认中等

  // 检测 iPhone/iPad/Mac
  if (ua.includes('iphone')) {
    brand = 'iphone'
    if (ua.includes('16') || ua.includes('15') || ua.includes('14') || ua.includes('13')) {
      tier = 10
    } else if (ua.includes('12') || ua.includes('11')) {
      tier = 8
    } else {
      tier = 6
    }
  } else if (ua.includes('ipad')) {
    brand = 'ipad'
    tier = 9
  } else if (ua.includes('mac')) {
    brand = 'mac'
    tier = 10
  }
  // 检测三星
  else if (ua.includes('sm-') || ua.includes('samsung')) {
    brand = 'samsung'
    if (ua.includes('sm-g9') || ua.includes('sm-s9') || ua.includes('sm-f')) {
      tier = 8 // 高端机型
    } else if (ua.includes('sm-a') || ua.includes('sm-m')) {
      tier = 5 // 中低端
    }
  }
  // 检测华为
  else if (ua.includes('huawei') || ua.includes('mate') || ua.includes('p30') || ua.includes('p40') || ua.includes('p50') || ua.includes('p60')) {
    brand = 'huawei'
    if (ua.includes('mate 30') || ua.includes('mate 40') || ua.includes('mate 50') || ua.includes('p30 pro') || ua.includes('p40 pro') || ua.includes('p50 pro')) {
      tier = 8
    }
  }
  // 检测小米/红米
  else if (ua.includes('mi') || ua.includes('redmi') || ua.includes('poco')) {
    brand = ua.includes('poco') ? 'poco' : (ua.includes('redmi') ? 'redmi' : 'xiaomi')
    if (ua.includes('mi 1') || ua.includes('mi 12') || ua.includes('mi 13') || ua.includes('mi 14')) {
      tier = 7 // 小米旗舰
    } else {
      tier = 5
    }
  }
  // 检测 OPPO/Vivo/一加
  else if (ua.includes('oppo') || ua.includes('realme')) {
    brand = 'oppo'
    tier = 6
  } else if (ua.includes('vivo')) {
    brand = 'vivo'
    tier = 6
  } else if (ua.includes('oneplus')) {
    brand = 'oneplus'
    tier = 7
  }
  // 检测 Google Pixel
  else if (ua.includes('pixel')) {
    brand = 'google'
    tier = 7
  }

  return {
    brand,
    tier,
    isHighEnd: tier >= 8,
  }
}

function calculateAgeFromDevice(deviceInfo: DeviceInfo, os: string, browser: string): { minAge: number; maxAge: number; generation: string } {
  // 基于设备推断年龄段的简单逻辑
  // iPhone 最新代 = 年轻专业人士 (25-35)
  // iPhone 老款 = 中年人 (35-50) 
  // Android 低端 = 较年长或预算有限 (40-60)
  
  if (deviceInfo.brand === 'iphone' && deviceInfo.tier >= 9) {
    return { minAge: 22, maxAge: 40, generation: 'Y/Z世代' }
  } else if (deviceInfo.brand === 'iphone') {
    return { minAge: 30, maxAge: 55, generation: 'X/婴儿潮' }
  } else if (deviceInfo.brand === 'mac') {
    return { minAge: 25, maxAge: 45, generation: 'Y/Z世代' }
  } else if (deviceInfo.brand === 'samsung' && deviceInfo.tier >= 7) {
    return { minAge: 25, maxAge: 45, generation: 'Y世代' }
  } else if (deviceInfo.tier >= 6) {
    return { minAge: 28, maxAge: 50, generation: 'X/Y世代' }
  } else {
    return { minAge: 35, maxAge: 60, generation: 'X/婴儿潮' }
  }
}

function calculatePurchasePower(
  deviceInfo: DeviceInfo,
  countryTier: number,
  browserProfile: { tier: number; type: string }
): { score: number; level: string } {
  // 设备权重 40%, 地区权重 35%, 浏览器权重 25%
  const score = Math.round(
    deviceInfo.tier * 0.4 * 10 +
    countryTier * 0.35 * 10 +
    browserProfile.tier * 0.25 * 10
  )
  
  let level: string
  if (score >= 80) level = '高消费力'
  else if (score >= 60) level = '中高消费力'
  else if (score >= 40) level = '中等消费力'
  else if (score >= 20) level = '较低消费力'
  else level = '低消费力'
  
  return { score, level }
}

function calculateIntentScore(
  pageViewCount: number,
  avgTimeOnSite: number,
  toolInteractionCount: number,
  hasInquiry: boolean,
  trafficSourceScore: number,
  scrollDepth: number
): { score: number; level: string } {
  let score = 0
  
  // 页面浏览量 (最高 20 分)
  score += Math.min(pageViewCount * 3, 20)
  
  // 平均停留时间 (最高 25 分)
  if (avgTimeOnSite > 300) score += 25       // > 5分钟
  else if (avgTimeOnSite > 120) score += 18  // > 2分钟
  else if (avgTimeOnSite > 60) score += 12   // > 1分钟
  else if (avgTimeOnSite > 30) score += 6    // > 30秒
  
  // 工具交互 (最高 20 分)
  score += Math.min(toolInteractionCount * 5, 20)
  
  // 是否有询盘 (25 分)
  if (hasInquiry) score += 25
  
  // 流量来源 (最高 10 分)
  score += trafficSourceScore
  
  // 滚动深度 (最高 10 分)
  if (scrollDepth >= 80) score += 10
  else if (scrollDepth >= 50) score += 6
  else if (scrollDepth >= 30) score += 3
  
  let level: string
  if (score >= 80) level = '极高意向'
  else if (score >= 60) level = '高意向'
  else if (score >= 40) level = '中等意向'
  else if (score >= 20) level = '低意向'
  else level = '浏览为主'
  
  return { score, level }
}

function calculateConversionProbability(
  purchasePowerScore: number,
  intentScore: number,
  returnVisitCount: number,
  hasInquiry: boolean
): { probability: number; level: string } {
  // 基础概率
  let baseProb = 5 // 5% 基础
  
  // 消费能力加权
  baseProb += purchasePowerScore * 0.15
  
  // 意向度加权
  baseProb += intentScore * 0.25
  
  // 回访加成
  baseProb += returnVisitCount * 3
  
  // 有询盘直接大幅提升
  if (hasInquiry) baseProb += 40
  
  const probability = Math.min(Math.round(baseProb), 99)
  
  let level: string
  if (probability >= 70) level = '极有可能'
  else if (probability >= 50) level = '很可能'
  else if (probability >= 30) level = '有可能'
  else if (probability >= 10) level = '不太可能'
  else level = '几乎不可能'
  
  return { probability, level }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 401 })
  }

  if (!isDbConfigured || !sql) {
    return NextResponse.json({
      data: [],
      summary: { totalVisitors: 0 }
    })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) {
      return NextResponse.json({ data: [], summary: { totalVisitors: 0 } })
    }

    const days = Math.min(Number(searchParams.get('days') ?? 30), 90)
    const page = Math.max(Number(searchParams.get('page') ?? 1), 1)
    const pageSize = Math.min(Number(searchParams.get('pageSize') ?? 10), 100)
    const offset = (page - 1) * pageSize

    const since = new Date()
    since.setDate(since.getDate() - days)

    // 先获取总数
    const countResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as total
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${since.toISOString()}
    `
    const totalVisitors = Number(countResult[0]?.total ?? 0)

    // 获取所有访客的基础数据（带分页）
    const visitorData = await sql`
      SELECT 
        v.visitor_id,
        v.device_type,
        v.browser,
        v.os,
        v.user_agent,
        v.geo_country,
        v.geo_city,
        v.traffic_source,
        COUNT(DISTINCT v.session_id) as sessions,
        COUNT(*) as page_views,
        MAX(v.created_at) as last_visit,
        MIN(v.created_at) as first_visit,
        60 as avg_session_duration
      FROM public.tracking_events v
      WHERE v.tenant_id = ${tenantId}
        AND v.created_at >= ${since.toISOString()}
      GROUP BY v.visitor_id, v.device_type, v.browser, v.os, v.user_agent, v.geo_country, v.geo_city, v.traffic_source
      ORDER BY last_visit DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `

    // 获取工具交互数据
    const toolData = await sql`
      SELECT visitor_id, COUNT(*) as interactions
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${since.toISOString()}
      GROUP BY visitor_id
    `

    // 获取询盘数据
    const inquiryData = await sql`
      SELECT visitor_id, COUNT(*) as inquiries
      FROM public.inquiries
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${since.toISOString()}
      GROUP BY visitor_id
    `

    // 构建工具交互映射
    const toolMap = new Map<string, number>()
    for (const row of toolData) {
      toolMap.set(row.visitor_id, Number(row.interactions))
    }

    // 构建询盘映射
    const inquiryMap = new Map<string, number>()
    for (const row of inquiryData) {
      inquiryMap.set(row.visitor_id, Number(row.inquiries))
    }

    // 分析每个访客
    const enrichedVisitors = visitorData.map(v => {
      const deviceInfo = parseDeviceInfo(v.user_agent || '', v.device_type || '')
      const normalizedCountry = (v.geo_country || '').toLowerCase().trim()
      const countryTier = COUNTRY_TIER[normalizedCountry] || COUNTRY_TIER[v.geo_country || ''] || 5
      const browserProfile = BROWSER_PROFILE[v.browser?.toLowerCase() || ''] || { tier: 5, type: 'unknown' }
      const trafficScore = TRAFFIC_SOURCE_SCORE[v.traffic_source?.toLowerCase() || ''] || 5

      // 计算画像
      const ageRange = calculateAgeFromDevice(deviceInfo, v.os || '', v.browser || '')
      const purchasePower = calculatePurchasePower(deviceInfo, countryTier, browserProfile)
      const intentScore = calculateIntentScore(
        Number(v.page_views),
        Number(v.avg_session_duration || 60),
        toolMap.get(v.visitor_id) || 0,
        (inquiryMap.get(v.visitor_id) || 0) > 0,
        trafficScore,
        50 // 简化处理
      )
      const conversion = calculateConversionProbability(
        purchasePower.score,
        intentScore.score,
        Number(v.sessions) - 1 || 0,
        (inquiryMap.get(v.visitor_id) || 0) > 0
      )

      return {
        visitor_id: v.visitor_id,
        device: {
          type: v.device_type,
          brand: deviceInfo.brand,
          tier: deviceInfo.tier,
          isHighEnd: deviceInfo.isHighEnd,
          browser: v.browser,
          os: v.os,
        },
        location: {
          country: normalizeCountry(v.geo_country),
          city: v.geo_city,
          tier: countryTier,
        },
        behavior: {
          sessions: Number(v.sessions),
          pageViews: Number(v.page_views),
          toolInteractions: toolMap.get(v.visitor_id) || 0,
          hasInquiry: (inquiryMap.get(v.visitor_id) || 0) > 0,
          trafficSource: v.traffic_source,
        },
        profile: {
          estimatedAge: ageRange,
          purchasePower,
          intentScore,
          conversionProbability: conversion,
        },
        lastVisit: v.last_visit,
        firstVisit: v.first_visit,
      }
    })

    // 统计摘要
    const summary = {
      totalVisitors: totalVisitors,
      highIntentVisitors: enrichedVisitors.filter(v => v.profile.intentScore.score >= 60).length,
      highPurchasePower: enrichedVisitors.filter(v => v.profile.purchasePower.score >= 70).length,
      withInquiries: enrichedVisitors.filter(v => v.behavior.hasInquiry).length,
      avgConversionProbability: Math.round(
        enrichedVisitors.reduce((sum, v) => sum + v.profile.conversionProbability.probability, 0) / 
        (enrichedVisitors.length || 1)
      ),
    }

    return NextResponse.json({
      data: enrichedVisitors,
      summary,
    })
  } catch (error) {
    console.error('Visitor profile API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      details: error
    }, { status: 500 })
  }
}
