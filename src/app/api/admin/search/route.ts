/**
 * 全局搜索 API
 * 从真实数据库搜索用户、线索、会话等
 */

import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')
  const query = searchParams.get('q') || ''
  const type = searchParams.get('type') || 'all'

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 401 })
  }

  if (!query || query.length < 1) {
    return NextResponse.json({ users: [], inquiries: [], chat: [] })
  }

  // 数据库未配置
  if (!isDbConfigured || !sql) {
    return NextResponse.json({ 
      users: [], 
      inquiries: [], 
      chat: [],
      error: 'Database not configured'
    })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) {
      return NextResponse.json({ users: [], inquiries: [], chat: [] })
    }

    const results: {
      users: any[]
      inquiries: any[]
      chat: any[]
    } = {
      users: [],
      inquiries: [],
      chat: [],
    }

    // 搜索用户 (从 users 表)
    if (type === 'all' || type === 'users') {
      const usersResult = await sql`
        SELECT id, name, email, company, visitor_id, last_visit_at
        FROM public.users
        WHERE tenant_id = ${tenantId}
          AND (name ILIKE ${`%${query}%`} OR email ILIKE ${`%${query}%`} OR company ILIKE ${`%${query}%`})
        ORDER BY last_visit_at DESC
        LIMIT 5
      `
      results.users = usersResult.map((row: any) => ({
        id: row.id,
        title: row.name || row.email || '未知用户',
        description: row.company || row.email || row.visitor_id?.substring(0, 8),
        type: 'user',
        timestamp: row.last_visit_at,
      }))
    }

    // 搜索询盘 (从 inquiries 表)
    if (type === 'all' || type === 'inquiries') {
      const inquiriesResult = await sql`
        SELECT id, name, email, company, product_type, status, created_at
        FROM public.inquiries
        WHERE tenant_id = ${tenantId}
          AND (name ILIKE ${`%${query}%`} OR email ILIKE ${`%${query}%`} OR company ILIKE ${`%${query}%`} OR message ILIKE ${`%${query}%`})
        ORDER BY created_at DESC
        LIMIT 5
      `
      results.inquiries = inquiriesResult.map((row: any) => ({
        id: row.id,
        title: row.name || row.email || '询盘',
        description: `${row.product_type || ''} - ${row.company || '个人'}`,
        type: 'inquiry',
        status: row.status,
        timestamp: row.created_at,
      }))
    }

    // 搜索会话/工具交互 (从 tool_interactions 表)
    if (type === 'all' || type === 'chat') {
      const chatResult = await sql`
        SELECT DISTINCT ON (session_id)
          id, visitor_id, tool_name, action, input_data, created_at
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId}
          AND (input_data::text ILIKE ${`%${query}%`} OR output_data::text ILIKE ${`%${query}%`})
        ORDER BY session_id, created_at DESC
        LIMIT 5
      `
      results.chat = chatResult.map((row: any) => ({
        id: row.id,
        title: row.tool_name || '工具会话',
        description: row.visitor_id?.substring(0, 8) || '访客',
        type: 'chat',
        timestamp: row.created_at,
      }))
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ 
      users: [], 
      inquiries: [], 
      chat: [],
      error: String(error) 
    }, { status: 500 })
  }
}
