/**
 * 询盘列表 API
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'zxqconsulting'
  const status = searchParams.get('status')
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const offset = Number(searchParams.get('offset') ?? 0)

  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  try {
    const tenantRows = await sql`SELECT id FROM public.tenants WHERE slug=${tenantSlug} LIMIT 1`
    const tenantId = tenantRows[0]?.id
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

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
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  try {
    const { id, status, assignee, priority } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

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
