/**
 * 聊天记录管理 API
 * 同时查询 chat_histories 和 tool_interactions，确保展示完整的聊天和工具交互记录
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
  '印度': '印度', 'india': '印度', 'IN': '印度',
  '俄罗斯': '俄罗斯', 'russia': '俄罗斯', 'RU': '俄罗斯', 'ru': '俄罗斯',
  '巴西': '巴西', 'brazil': '巴西', 'BR': '巴西',
  '墨西哥': '墨西哥', 'mexico': '墨西哥', 'MX': '墨西哥',
  '荷兰': '荷兰', 'netherlands': '荷兰', 'NL': '荷兰',
  '瑞士': '瑞士', 'switzerland': '瑞士', 'CH': '瑞士',
  '意大利': '意大利', 'italy': '意大利', 'IT': '意大利',
  '西班牙': '西班牙', 'spain': '西班牙', 'ES': '西班牙',
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

function extractMessage(row: any): string {
  // 1. 直接的 message 字段
  if (row.message) return String(row.message).substring(0, 200)

  // 2. 从 input_params 提取
  if (row.input_params) {
    try {
      const input = typeof row.input_params === 'string' ? JSON.parse(row.input_params) : row.input_params
      return input.message || input.query || input.user_message || input.question
        || JSON.stringify(input).substring(0, 100)
    } catch {
      return String(row.input_params).substring(0, 100)
    }
  }

  // 3. 从 output_result 提取
  if (row.output_result) {
    try {
      const output = typeof row.output_result === 'string' ? JSON.parse(row.output_result) : row.output_result
      return output.ai_message || output.result || output.summary
        || JSON.stringify(output).substring(0, 100)
    } catch {
      return String(row.output_result).substring(0, 100)
    }
  }

  return ''
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

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('limit') || '20')
  const tool = searchParams.get('tool')
  const search = searchParams.get('search')

  if (!isDbConfigured || !sql) {
    return NextResponse.json({
      data: [],
      total: 0,
      page,
      pageSize,
      error: 'Database not configured'
    })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) {
      return NextResponse.json({ data: [], total: 0, page, pageSize })
    }

    const offset = (page - 1) * pageSize

    // 工具筛选条件
    const toolCond = tool ? sql`AND tool_name = ${tool}` : sql``

    // 搜索条件
    const searchCond = search
      ? sql`AND (
           input_params::text ILIKE ${`%${search}%`}
           OR output_result::text ILIKE ${`%${search}%`}
           OR user_message ILIKE ${`%${search}%`}
           OR ai_message ILIKE ${`%${search}%`}
         )`
      : sql``

    // 从 tool_interactions 查询所有工具交互记录（包含聊天消息）
    // 使用 LOWER(tool_name) 统一大小写
    const query = await sql`
      SELECT
        id,
        visitor_id,
        session_id,
        LOWER(tool_name) as tool_name,
        action,
        input_params,
        output_result,
        duration_ms,
        step_completed,
        total_steps,
        user_message,
        ai_message,
        created_at,
        te.geo_country,
        te.geo_city,
        te.device_type,
        te.browser
      FROM public.tool_interactions ti
      LEFT JOIN LATERAL (
        SELECT geo_country, geo_city, device_type, browser
        FROM public.tracking_events
        WHERE tenant_id = ti.tenant_id
          AND session_id = ti.session_id
        ORDER BY created_at DESC
        LIMIT 1
      ) te ON true
      WHERE ti.tenant_id = ${tenantId}
        ${toolCond}
        ${searchCond}
      ORDER BY ti.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `

    // 计数查询
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM public.tool_interactions ti
      WHERE ti.tenant_id = ${tenantId}
        ${toolCond}
        ${searchCond}
    `
    const total = Number(countResult[0]?.total ?? 0)

    // 转换数据格式
    const data = query.map((row: any) => {
      const normalizedCountry = normalizeCountry(row.geo_country)
      let visitorLabel = '访客'
      if (normalizedCountry && row.geo_city) {
        visitorLabel = `${normalizedCountry} ${row.geo_city}`
      } else if (normalizedCountry) {
        visitorLabel = normalizedCountry
      } else if (row.device_type) {
        visitorLabel = row.device_type
      }

      // 优先使用 user_message/ai_message 字段
      let message = ''
      if (row.user_message) {
        message = String(row.user_message).substring(0, 200)
      } else if (row.ai_message) {
        message = String(row.ai_message).substring(0, 200)
      } else {
        message = extractMessage(row)
      }

      // 解析 JSON 字符串字段
      let parsedInputParams = null
      let parsedOutputResult = null

      try {
        parsedInputParams = typeof row.input_params === 'string' ? JSON.parse(row.input_params) : (row.input_params || null)
      } catch {
        parsedInputParams = row.input_params
      }

      try {
        parsedOutputResult = typeof row.output_result === 'string' ? JSON.parse(row.output_result) : (row.output_result || null)
      } catch {
        parsedOutputResult = row.output_result
      }

      return {
        id: row.id,
        visitor_id: row.visitor_id,
        visitor_label: visitorLabel || row.visitor_id?.substring(0, 8) || '访客',
        device: row.device_type || '-',
        browser: row.browser || '-',
        location: normalizedCountry && row.geo_city ? `${normalizedCountry}·${row.geo_city}` : (normalizedCountry || '-'),
        tool_name: row.tool_name,
        action: row.action,
        message,
        user_message: row.user_message || '',
        ai_message: row.ai_message || '',
        input_params: parsedInputParams,
        output_result: parsedOutputResult,
        duration_ms: row.duration_ms,
        step_completed: row.step_completed,
        total_steps: row.total_steps,
        created_at: row.created_at,
      }
    })

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({
      data: [],
      total: 0,
      page,
      pageSize,
      error: String(error)
    }, { status: 500 })
  }
}
