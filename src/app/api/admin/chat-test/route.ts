import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  if (!isDbConfigured || !sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503, headers: corsHeaders })
  }

  try {
    // 检查租户列表
    const tenants = await sql`
      SELECT id, name, slug FROM public.tenants ORDER BY slug
    `
    
    // 检查每个租户的 tool_interactions 数量
    const results = []
    for (const tenant of tenants) {
      const count = await sql`
        SELECT COUNT(*) as count FROM public.tool_interactions WHERE tenant_id = ${tenant.id}
      `
      results.push({
        tenant: tenant.name,
        slug: tenant.slug,
        tool_interactions: Number(count[0]?.count || 0)
      })
    }

    return NextResponse.json({ 
      tenants: results,
      total_tenants: tenants.length
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Check data error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500, headers: corsHeaders })
  }
}

// 生成测试聊天数据
export async function POST(request: NextRequest) {
  if (!isDbConfigured || !sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503, headers: corsHeaders })
  }

  try {
    const body = await request.json()
    const { tenantSlug = 'zxqconsulting', count = 50 } = body

    // 获取租户 ID
    const tenantResult = await sql`
      SELECT id FROM public.tenants WHERE slug = ${tenantSlug} LIMIT 1
    `
    
    if (tenantResult.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404, headers: corsHeaders })
    }
    
    const tenantId = tenantResult[0].id

    // 生成工具交互数据
    const tools = ['ai_chat', 'market_analyzer', 'naming', 'tarot', 'fengshui']
    const actions = ['start', 'input', 'submit', 'complete', 'abandon']
    const countries = ['United States', 'United Kingdom', 'Australia', 'Canada', 'China', 'Japan', 'Germany']
    const cities = ['New York', 'London', 'Sydney', 'Toronto', 'Beijing', 'Tokyo', 'Berlin']
    
    const sampleQueries = [
      '我想了解中医药出口到美国的市场情况',
      '请帮我分析一下这个产品的市场潜力',
      '什么是最适合进入的海外市场？',
      '请给我推荐一个品牌名称',
      '我的生辰八字适合做什么行业？',
      '帮我算一算今天的运势',
      '这个房子风水怎么样？',
      '中医药在国际上的发展趋势如何？'
    ]

    const sampleResponses = [
      '根据数据分析，美国是最大的中医药市场，年度增长率约15%。',
      '建议您重点关注东南亚市场，那里的需求增长迅速。',
      '您的品牌名称建议使用"HerbVital"，简洁易记。',
      '根据您的生辰八字，今年适合从事与木相关的行业。',
      '今日运势：事业运势较好，适合开展新项目。',
      '这个房子朝向东南方向采光很好，风水不错。'
    ]

    let inserted = 0
    for (let i = 0; i < count; i++) {
      const tool = tools[Math.floor(Math.random() * tools.length)]
      const action = actions[Math.floor(Math.random() * actions.length)]
      const countryIdx = Math.floor(Math.random() * countries.length)
      
      const visitorId = `v_${Date.now()}_${i}`
      const sessionId = `s_${Date.now()}_${i}`
      
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // 过去30天内随机
      
      const inputData = {
        query: sampleQueries[Math.floor(Math.random() * sampleQueries.length)],
        language: 'zh-CN'
      }
      
      const outputData = action === 'complete' || action === 'submit' ? {
        response: sampleResponses[Math.floor(Math.random() * sampleResponses.length)],
        suggestions: ['查看详情', '继续咨询']
      } : null

      await sql`
        INSERT INTO public.tool_interactions (
          tenant_id, visitor_id, session_id, tool_name, action,
          input_data, output_data, duration_seconds, conversation_turns, created_at
        ) VALUES (
          ${tenantId}, ${visitorId}, ${sessionId}, ${tool}, ${action},
          ${JSON.stringify(inputData)}, ${outputData ? JSON.stringify(outputData) : null},
          ${Math.floor(Math.random() * 300) + 30}, ${Math.floor(Math.random() * 10) + 1},
          ${createdAt.toISOString()}
        )
      `
      inserted++
    }

    return NextResponse.json({ 
      success: true, 
      message: `已生成 ${inserted} 条聊天记录`,
      inserted
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Generate chat data error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500, headers: corsHeaders })
  }
}
