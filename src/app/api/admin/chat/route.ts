/**
 * 聊天记录管理 API
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

// Mock 数据
const mockChatData = [
  { id: '1', divination_type: 'bazi', user_message: '我的八字怎么样？', ai_message: '根据您的出生时间...', created_at: '2026-03-07T10:00:00Z', visitor_id: 'visitor_001' },
  { id: '2', divination_type: 'fengshui', user_message: '家里客厅怎么布局？', ai_message: '客厅风水要注意...', created_at: '2026-03-07T09:30:00Z', visitor_id: 'visitor_002' },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  // 租户验证
  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter. Please provide a valid tenant slug.' },
      { status: 401 }
    )
  }
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const module = searchParams.get('module')
  const keyword = searchParams.get('keyword')

  if (!isDbConfigured || !sql) {
    let data = [...mockChatData]
    if (module) data = data.filter(c => c.divination_type === module)
    if (keyword) data = data.filter(c => c.user_message.includes(keyword) || c.ai_message.includes(keyword))
    return NextResponse.json({
      data,
      total: data.length,
      page,
      pageSize,
    })
  }

  try {
    // 获取租户 ID
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const offset = (page - 1) * pageSize

    // 查询聊天记录 - 按会话分组，每条会话显示用户和AI的最后一条消息
    let query
    if (keyword) {
      query = await sql`
        SELECT 
          id,
          visitor_id,
          session_id,
          divination_type,
          role,
          content,
          created_at
        FROM public.chat_histories
        WHERE tenant_id = ${tenantId}
          AND content ILIKE ${`%${keyword}%`}
        ORDER BY created_at DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `
    } else if (module) {
      query = await sql`
        SELECT 
          id,
          visitor_id,
          session_id,
          divination_type,
          role,
          content,
          created_at
        FROM public.chat_histories
        WHERE tenant_id = ${tenantId}
          AND divination_type = ${module}
        ORDER BY created_at DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `
    } else {
      query = await sql`
        SELECT 
          id,
          visitor_id,
          session_id,
          divination_type,
          role,
          content,
          created_at
        FROM public.chat_histories
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `
    }

    // 重组数据 - 按会话分组
    const chatMap = new Map()
    for (const row of query) {
      const sessionKey = `${row.session_id}-${row.divination_type}`
      if (!chatMap.has(sessionKey)) {
        chatMap.set(sessionKey, {
          id: row.id,
          visitor_id: row.visitor_id,
          session_id: row.session_id,
          divination_type: row.divination_type,
          user_message: '',
          ai_message: '',
          created_at: row.created_at,
        })
      }
      if (row.role === 'user' && !chatMap.get(sessionKey).user_message) {
        chatMap.get(sessionKey).user_message = row.content
      } else if (row.role === 'assistant' && !chatMap.get(sessionKey).ai_message) {
        chatMap.get(sessionKey).ai_message = row.content
      }
    }

    const data = Array.from(chatMap.values())

    // 获取总数
    let countQuery
    if (keyword) {
      countQuery = await sql`
        SELECT COUNT(DISTINCT session_id || divination_type) as total
        FROM public.chat_histories
        WHERE tenant_id = ${tenantId}
          AND content ILIKE ${`%${keyword}%`}
      `
    } else if (module) {
      countQuery = await sql`
        SELECT COUNT(DISTINCT session_id || divination_type) as total
        FROM public.chat_histories
        WHERE tenant_id = ${tenantId}
          AND divination_type = ${module}
      `
    } else {
      countQuery = await sql`
        SELECT COUNT(DISTINCT session_id || divination_type) as total
        FROM public.chat_histories
        WHERE tenant_id = ${tenantId}
      `
    }

    return NextResponse.json({
      data,
      total: Number(countQuery[0]?.total ?? 0),
      page,
      pageSize,
    })
  } catch (error) {
    console.error('Chat history API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
