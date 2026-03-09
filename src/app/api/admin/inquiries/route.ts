/**
 * 询盘列表 API
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  // 租户验证：如果没有提供租户参数，拒绝请求
  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter. Please provide a valid tenant slug.' },
      { status: 401 }
    )
  }

  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const status = searchParams.get('status')
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
    const offset = Number(searchParams.get('offset') ?? 0)

    const rows = status
      ? await sql`
          SELECT id, name, phone, email, company, product_type, target_market, message,
                 status, priority, assignee, source, created_at, updated_at
          FROM public.inquiries
          WHERE tenant_id=${tenantId} AND status=${status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}`
      : await sql`
          SELECT id, name, phone, email, company, product_type, target_market, message,
                 status, priority, assignee, source, created_at, updated_at
          FROM public.inquiries
          WHERE tenant_id=${tenantId}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}`

    const total = status
      ? await sql`SELECT COUNT(*) AS cnt FROM public.inquiries WHERE tenant_id=${tenantId} AND status=${status}`
      : await sql`SELECT COUNT(*) AS cnt FROM public.inquiries WHERE tenant_id=${tenantId}`

    return NextResponse.json({
      data: rows,
      total: Number(total[0]?.cnt ?? 0),
    })
  } catch (error) {
    console.error('Inquiries API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  // 租户验证
  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter. Please provide a valid tenant slug.' },
      { status: 401 }
    )
  }

  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  
  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const { id, status, assignee, priority } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // 验证询盘属于当前租户
    const existing = await sql`SELECT id FROM public.inquiries WHERE id=${id} AND tenant_id=${tenantId} LIMIT 1`
    if (!existing[0]) {
      return NextResponse.json({ error: 'Inquiry not found or access denied' }, { status: 403 })
    }

    await sql`
      UPDATE public.inquiries
      SET
        status = COALESCE(${status ?? null}, status),
        assignee = COALESCE(${assignee ?? null}, assignee),
        priority = COALESCE(${priority ?? null}, priority),
        updated_at = NOW()
      WHERE id = ${id}
    `
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Inquiries PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 创建新询盘
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  // 租户验证
  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter. Please provide a valid tenant slug.' },
      { status: 401 }
    )
  }

  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const body = await request.json()
    const { name, phone, email, company, product_type, target_market, message, source, status, priority, assignee } = body

    // 验证必填字段
    if (!name && !phone && !email) {
      return NextResponse.json({ error: 'At least one contact method is required (name, phone, or email)' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO public.inquiries 
        (tenant_id, name, phone, email, company, product_type, target_market, message, source, status, priority, assignee)
      VALUES 
        (${tenantId}, ${name ?? null}, ${phone ?? null}, ${email ?? null}, ${company ?? null}, 
         ${product_type ?? null}, ${target_market ?? null}, ${message ?? null}, ${source ?? 'manual'}, 
         ${status ?? 'pending'}, ${priority ?? null}, ${assignee ?? null})
      RETURNING id
    `

    return NextResponse.json({ success: true, id: result[0]?.id })
  } catch (error) {
    console.error('Inquiries POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
