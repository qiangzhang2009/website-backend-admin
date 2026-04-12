/**
 * Prismatic Analytics - 内容健康度 API
 * GET /api/admin/prismatic/content?tenant=prismatic&days=30
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantIdBySlug, isDbConfigured } from '@/lib/db'
import { getPrismaticContentHealth } from '@/lib/db/prismatic'

const mockTenants: Record<string, string> = {
  prismatic: 'tenant_prismatic',
  zxqconsulting: 'tenant_001',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'prismatic'
  const days = parseInt(searchParams.get('days') || '30', 10)

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

    const content = await getPrismaticContentHealth(tenantId, days)

    return NextResponse.json({ pages: content })
  } catch (error) {
    console.error('Prismatic content API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
