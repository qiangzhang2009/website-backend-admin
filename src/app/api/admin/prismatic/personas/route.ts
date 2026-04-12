/**
 * Prismatic Analytics - 人物热度 API
 * GET /api/admin/prismatic/personas?tenant=prismatic&days=30&domain=philosophy&sort=views&order=desc
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantIdBySlug, isDbConfigured } from '@/lib/db'
import { getPrismaticPersonas } from '@/lib/db/prismatic'

const mockTenants: Record<string, string> = {
  prismatic: 'tenant_prismatic',
  zxqconsulting: 'tenant_001',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'prismatic'
  const days = parseInt(searchParams.get('days') || '30', 10)
  const domain = searchParams.get('domain') || undefined
  const sort = searchParams.get('sort') || 'views'
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  try {
    let tenantId: string | null = null

    if (isDbConfigured) {
      tenantId = await getTenantIdBySlug(tenantSlug)
      if (!tenantId) tenantId = mockTenants[tenantSlug] ?? null
    } else {
      tenantId = mockTenants[tenantSlug] ?? null
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const personas = await getPrismaticPersonas(tenantId, { days, domain, sort, order, limit })

    return NextResponse.json({ personas })
  } catch (error) {
    console.error('Prismatic personas API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
