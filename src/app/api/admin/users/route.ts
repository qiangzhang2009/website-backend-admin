/**
 * 用户列表 API
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'zxqconsulting'
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const offset = Number(searchParams.get('offset') ?? 0)
  const search = searchParams.get('search')

  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  try {
    const tenantRows = await sql`SELECT id FROM public.tenants WHERE slug=${tenantSlug} LIMIT 1`
    const tenantId = tenantRows[0]?.id
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const rows = search
      ? await sql`
          SELECT id, visitor_id, name, phone, email, company, product_type, target_market,
                 source, inquiry_count, visit_count, first_visit_at, last_visit_at,
                 first_inquiry_at, last_inquiry_at, created_at
          FROM public.users
          WHERE tenant_id=${tenantId}
            AND (name ILIKE ${'%' + search + '%'} OR company ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'})
          ORDER BY last_visit_at DESC NULLS LAST
          LIMIT ${limit} OFFSET ${offset}`
      : await sql`
          SELECT id, visitor_id, name, phone, email, company, product_type, target_market,
                 source, inquiry_count, visit_count, first_visit_at, last_visit_at,
                 first_inquiry_at, last_inquiry_at, created_at
          FROM public.users
          WHERE tenant_id=${tenantId}
          ORDER BY last_visit_at DESC NULLS LAST
          LIMIT ${limit} OFFSET ${offset}`

    const total = await sql`SELECT COUNT(*) AS cnt FROM public.users WHERE tenant_id=${tenantId}`

    return NextResponse.json({
      data: rows,
      total: Number(total[0]?.cnt ?? 0),
    })
  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
