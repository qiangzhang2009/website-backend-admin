/**
 * Prismatic Analytics - 转化漏斗 API
 * GET /api/admin/prismatic/funnel?tenant=prismatic&days=30
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantIdBySlug, isDbConfigured } from '@/lib/db'
import { getPrismaticFunnel } from '@/lib/db/prismatic'

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

    const funnel = await getPrismaticFunnel(tenantId, days)

    return NextResponse.json({ steps: funnel })
  } catch (error) {
    console.error('Prismatic funnel API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
