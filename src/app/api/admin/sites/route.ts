/**
 * 多网站（租户）管理 API
 * GET  /api/admin/sites  — 列出所有租户及其统计数据
 * POST /api/admin/sites  — 新增租户
 */

import { NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'

export async function GET() {
  if (!isDbConfigured || !sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    // 获取所有租户及各自的统计数据
    const tenants = await sql`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.domain,
        t.timezone,
        t.language,
        t.settings,
        t.created_at,
        COALESCE(u.user_count, 0)        AS users,
        COALESCE(i.inquiry_count, 0)     AS inquiries,
        COALESCE(e.event_count, 0)       AS page_views
      FROM public.tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) AS user_count
        FROM public.users
        GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) AS inquiry_count
        FROM public.inquiries
        GROUP BY tenant_id
      ) i ON i.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) AS event_count
        FROM public.tracking_events
        GROUP BY tenant_id
      ) e ON e.tenant_id = t.id
      ORDER BY t.created_at ASC
    `

    return NextResponse.json({ sites: tenants })
  } catch (error) {
    console.error('Failed to fetch sites:', error)
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured || !sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { name, slug, domain, timezone = 'Asia/Shanghai', language = 'zh-CN', features = {} } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO public.tenants (name, slug, domain, timezone, language, settings)
      VALUES (
        ${name},
        ${slug},
        ${domain ?? null},
        ${timezone},
        ${language},
        ${JSON.stringify({ features })}
      )
      RETURNING *
    `

    return NextResponse.json({ site: rows[0] }, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: '租户标识(slug)已存在' }, { status: 409 })
    }
    console.error('Failed to create site:', error)
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
  }
}
