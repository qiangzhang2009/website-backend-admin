/**
 * RFM 分析 API
 * 用户价值分层分析 - 基于真实数据
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

// 国家名称标准化映射
const COUNTRY_MAPPING: Record<string, string> = {
  '中国': '中国', 'china': '中国', 'CN': '中国', 'cn': '中国',
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
}

// 标准化国家名称（支持分号分隔的多国家名）
function normalizeCountry(country: string | null | undefined): string {
  if (!country) return ''
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
      { error: 'Missing tenant parameter. Please provide a valid tenant slug.' },
      { status: 401 }
    )
  }

  if (!isDbConfigured || !sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    // 获取访问统计数据（包含设备信息）
    const visitorStats = await sql`
      SELECT 
        visitor_id,
        MAX(created_at) AS last_visit,
        COUNT(*) AS visit_count,
        MAX(device_type) AS device_type,
        MAX(browser) AS browser,
        MAX(os) AS os,
        MAX(geo_country) AS geo_country,
        MAX(geo_city) AS geo_city,
        MAX(page_url) AS last_page
      FROM public.tracking_events
      WHERE tenant_id = ${tenantId}
      GROUP BY visitor_id
      LIMIT 100
    `

    // 获取询盘统计
    const inquiryStats = await sql`
      SELECT 
        visitor_id,
        COUNT(*) AS inquiry_count,
        MAX(name) AS last_inquiry_name,
        MAX(company) AS last_inquiry_company
      FROM public.inquiries
      WHERE tenant_id = ${tenantId}
      GROUP BY visitor_id
    `

    // 获取工具使用统计
    const toolStats = await sql`
      SELECT 
        visitor_id,
        COUNT(*) AS tool_count
      FROM public.tool_interactions
      WHERE tenant_id = ${tenantId}
      GROUP BY visitor_id
    `

    // 创建查询映射
    const inquiryMap = new Map(inquiryStats.map((r: any) => [r.visitor_id, {
      count: Number(r.inquiry_count),
      name: r.last_inquiry_name,
      company: r.last_inquiry_company
    }]))
    const toolMap = new Map(toolStats.map((r: any) => [r.visitor_id, Number(r.tool_count)]))

    // 计算 RFM
    const now = new Date()
    const data = visitorStats.map((r: any) => {
      const lastVisit = new Date(r.last_visit)
      const daysSinceLastVisit = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      const visitCount = Number(r.visit_count)
      const inquiryInfo = inquiryMap.get(r.visitor_id) || { count: 0, name: null, company: null }
      const toolCount = toolMap.get(r.visitor_id) || 0

      // 优先使用询盘信息中的姓名/公司
      const displayName = inquiryInfo.name || inquiryInfo.company || null
      
      // 构建显示名称：优先显示姓名，其次显示公司，都没有则显示设备+位置
      const normalizedCountry = normalizeCountry(r.geo_country)
      let displayLabel = ''
      if (inquiryInfo.name) {
        displayLabel = inquiryInfo.name
      } else if (inquiryInfo.company) {
        displayLabel = inquiryInfo.company
      } else if (normalizedCountry && r.geo_city) {
        displayLabel = `${normalizedCountry}${r.geo_city}`
      } else if (r.device_type && r.browser) {
        displayLabel = `${r.device_type}/${r.browser}`
      } else {
        displayLabel = '匿名访客'
      }

      // R 分数
      let rScore = 1
      if (daysSinceLastVisit <= 7) rScore = 5
      else if (daysSinceLastVisit <= 14) rScore = 4
      else if (daysSinceLastVisit <= 30) rScore = 3
      else if (daysSinceLastVisit <= 90) rScore = 2

      // F 分数
      let fScore = 1
      if (visitCount >= 20) fScore = 5
      else if (visitCount >= 10) fScore = 4
      else if (visitCount >= 5) fScore = 3
      else if (visitCount >= 2) fScore = 2

      // M 分数
      let mScore = 1
      const totalValue = inquiryInfo.count + toolCount
      if (totalValue >= 10) mScore = 5
      else if (totalValue >= 5) mScore = 4
      else if (totalValue >= 2) mScore = 3
      else if (totalValue >= 1) mScore = 2

      const rfmScore = rScore + fScore + mScore
      let rfmSegment = 'Lost'
      if (rfmScore >= 13) rfmSegment = 'VIP'
      else if (rfmScore >= 10) rfmSegment = 'Regular'
      else if (rfmScore >= 7) rfmSegment = 'At_Risk'

      return {
        visitorId: r.visitor_id,
        displayLabel,
        device: r.device_type ? `${r.device_type}/${r.browser || 'unknown'}` : 'unknown',
        location: normalizedCountry || r.geo_city ? `${normalizedCountry || ''}${r.geo_city || ''}` : '未知',
        lastPage: r.last_page || '/',
        lastVisit: r.last_visit,
        visitCount,
        inquiryCount: inquiryInfo.count,
        inquiryName: inquiryInfo.name,
        inquiryCompany: inquiryInfo.company,
        toolCount: toolCount,
        rScore,
        fScore,
        mScore,
        rfmScore,
        rfmSegment,
      }
    })

    // 统计各分段
    const summary = {
      VIP: data.filter(d => d.rfmSegment === 'VIP').length,
      Regular: data.filter(d => d.rfmSegment === 'Regular').length,
      At_Risk: data.filter(d => d.rfmSegment === 'At_Risk').length,
      Lost: data.filter(d => d.rfmSegment === 'Lost').length,
      total: data.length,
    }

    return NextResponse.json({ data, summary })
  } catch (error) {
    console.error('RFM API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'RFM 数据已实时计算' 
  })
}
