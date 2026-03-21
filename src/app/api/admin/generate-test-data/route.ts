/**
 * 测试数据生成 API
 * 生成真实的追踪数据用于测试，包含完整的设备/浏览器/地理位置信息
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

// 真实的国家-城市组合
const LOCATIONS = [
  { country: 'United States', city: 'New York' },
  { country: 'United States', city: 'Los Angeles' },
  { country: 'United States', city: 'San Francisco' },
  { country: 'United States', city: 'Chicago' },
  { country: 'United States', city: 'Seattle' },
  { country: 'United States', city: 'Boston' },
  { country: 'United States', city: 'Houston' },
  { country: 'United States', city: 'Miami' },
  { country: 'China', city: 'Beijing' },
  { country: 'China', city: 'Shanghai' },
  { country: 'China', city: 'Guangzhou' },
  { country: 'China', city: 'Shenzhen' },
  { country: 'China', city: 'Hangzhou' },
  { country: 'China', city: 'Chengdu' },
  { country: 'United Kingdom', city: 'London' },
  { country: 'Germany', city: 'Berlin' },
  { country: 'Germany', city: 'Munich' },
  { country: 'France', city: 'Paris' },
  { country: 'Japan', city: 'Tokyo' },
  { country: 'Japan', city: 'Osaka' },
  { country: 'South Korea', city: 'Seoul' },
  { country: 'Australia', city: 'Sydney' },
  { country: 'Australia', city: 'Melbourne' },
  { country: 'Canada', city: 'Toronto' },
  { country: 'Canada', city: 'Vancouver' },
  { country: 'Singapore', city: 'Singapore' },
  { country: 'India', city: 'Mumbai' },
  { country: 'India', city: 'Delhi' },
  { country: 'Brazil', city: 'Sao Paulo' },
]

// 设备配置
const DEVICES = [
  { type: 'desktop', browser: 'Chrome', os: 'Windows', weight: 45 },
  { type: 'desktop', browser: 'Chrome', os: 'macOS', weight: 25 },
  { type: 'desktop', browser: 'Firefox', os: 'Windows', weight: 8 },
  { type: 'desktop', browser: 'Safari', os: 'macOS', weight: 7 },
  { type: 'desktop', browser: 'Edge', os: 'Windows', weight: 5 },
  { type: 'mobile', browser: 'Chrome', os: 'Android', weight: 30 },
  { type: 'mobile', browser: 'Safari', os: 'iOS', weight: 35 },
  { type: 'mobile', browser: 'Chrome', os: 'iOS', weight: 10 },
  { type: 'mobile', browser: 'Samsung', os: 'Android', weight: 10 },
  { type: 'mobile', browser: 'Firefox', os: 'Android', weight: 3 },
  { type: 'tablet', browser: 'Safari', os: 'iOS', weight: 4 },
  { type: 'tablet', browser: 'Chrome', os: 'Android', weight: 3 },
]

// 流量来源
const TRAFFIC_SOURCES = [
  { source: 'direct', weight: 30 },
  { source: 'search', weight: 35 },
  { source: 'social', weight: 20 },
  { source: 'referral', weight: 15 },
]

// 搜索引擎
const SEARCH_ENGINES = ['google', 'bing', 'yahoo', 'baidu', 'yandex']

// 社交媒体
const SOCIAL_MEDIA = ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'tiktok', 'weibo', 'zhihu']

// 页面
const PAGES = [
  '/', '/about', '/products', '/products/herbal-medicine',
  '/services', '/contact', '/blog', '/market-analysis',
  '/tools/market-analyzer', '/tools/naming', '/tools/tarot',
  '/tools/fengshui', '/pricing', '/faq'
]

// 语言
const LANGUAGES = [
  { code: 'en-US', weight: 50 },
  { code: 'zh-CN', weight: 35 },
  { code: 'zh-TW', weight: 5 },
  { code: 'ja-JP', weight: 3 },
  { code: 'ko-KR', weight: 2 },
  { code: 'de-DE', weight: 2 },
  { code: 'fr-FR', weight: 2 },
  { code: 'es-ES', weight: 1 },
]

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function getWeightedRandom<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  let random = Math.random() * totalWeight
  for (const item of items) {
    random -= item.weight
    if (random <= 0) return item
  }
  return items[0]
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders })
  }

  if (!isDbConfigured || !sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders })
  }

  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get('tenant') || 'zxqconsulting'

    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404, headers: corsHeaders })
    }

    const visitorIds: string[] = []
    const visitorCount = 50

    for (let i = 0; i < visitorCount; i++) {
      const vid = `test_visitor_${Date.now()}_${i}`
      visitorIds.push(vid)

      // 为每个访客生成多次访问
      const sessionCount = Math.floor(Math.random() * 5) + 1
      for (let s = 0; s < sessionCount; s++) {
        const sessionId = `test_session_${Date.now()}_${i}_${s}`
        const daysAgo = Math.floor(Math.random() * 30)
        const visitTime = new Date()
        visitTime.setDate(visitTime.getDate() - daysAgo)

        // 随机选择设备、浏览器、操作系统
        const device = getWeightedRandom(DEVICES)
        const location = getRandomItem(LOCATIONS)
        const trafficSource = getWeightedRandom(TRAFFIC_SOURCES)
        const language = getWeightedRandom(LANGUAGES)

        // 生成引荐来源 URL
        let referrer = ''
        if (trafficSource.source === 'search') {
          const engine = getRandomItem(SEARCH_ENGINES)
          referrer = `https://www.${engine}.com/search?q=herbal+medicine+export`
        } else if (trafficSource.source === 'social') {
          const social = getRandomItem(SOCIAL_MEDIA)
          referrer = `https://www.${social}.com/post/123456`
        } else if (trafficSource.source === 'referral') {
          referrer = 'https://example.com/blog/herbal-medicine-guide'
        }

        // 生成页面浏览
        const pageCount = Math.floor(Math.random() * 6) + 1
        for (let p = 0; p < pageCount; p++) {
          const pageTime = new Date(visitTime.getTime() + p * 60000)
          const page = getRandomItem(PAGES)

          await sql`
            INSERT INTO public.tracking_events (
              tenant_id, visitor_id, session_id, event_type,
              page_url, referrer, user_agent, device_type, browser, os,
              geo_country, geo_city, language, traffic_source,
              screen_resolution, created_at
            ) VALUES (
              ${tenantId}, ${vid}, ${sessionId}, 'page_view',
              ${page}, ${referrer},
              'Mozilla/5.0 (${device.os} ${device.type === 'mobile' ? 'Mobile' : 'Windows NT 10.0'}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              ${device.type}, ${device.browser}, ${device.os},
              ${location.country}, ${location.city}, ${language.code}, ${trafficSource.source},
              ${device.type === 'mobile' ? '390x844' : '1920x1080'},
              ${pageTime.toISOString()}
            )
          `
        }

        // 30% 概率生成工具交互
        if (Math.random() > 0.7) {
          const toolTime = new Date(visitTime.getTime() + pageCount * 60000)
          const tools = ['market_analyzer', 'naming', 'tarot', 'fengshui', 'ai_chat']
          const tool = getRandomItem(tools)
          const actions = ['start', 'input', 'complete', 'abandon']
          const action = getRandomItem(actions)

          await sql`
            INSERT INTO public.tool_interactions (
              tenant_id, visitor_id, session_id, tool_name, action,
              duration_seconds, conversation_turns, created_at
            ) VALUES (
              ${tenantId}, ${vid}, ${sessionId}, ${tool}, ${action},
              ${Math.floor(Math.random() * 300) + 30}, ${Math.floor(Math.random() * 10) + 1},
              ${toolTime.toISOString()}
            )
          `
        }

        // 15% 概率生成询盘
        if (Math.random() > 0.85) {
          const inquiryTime = new Date(visitTime.getTime() + (pageCount + 1) * 60000)
          const names = ['John Smith', 'Wei Zhang', 'Michael Brown', '李明', '田中太郎']
          const companies = ['ABC Corp', 'XYZ Trading', '中药进出口', 'Herbal Plus', 'Global Trade']
          const products = ['中成药', '中药材', '保健品', '医疗器械', 'Herbal Extract']

          await sql`
            INSERT INTO public.inquiries (
              tenant_id, visitor_id, name, email, company,
              product_type, target_market, message, status, created_at
            ) VALUES (
              ${tenantId}, ${vid}, ${getRandomItem(names)}, ${`test${i}@example.com`}, ${getRandomItem(companies)},
              ${getRandomItem(products)}, '美国', 'Interested in your products, please contact me.', 'new',
              ${inquiryTime.toISOString()}
            )
          `
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `已生成 ${visitorIds.length} 个访客的测试数据`,
      visitorsCreated: visitorIds.length,
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Test data generation error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500, headers: corsHeaders })
  }
}
