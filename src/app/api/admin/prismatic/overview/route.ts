/**
 * Prismatic Analytics - 总览 API
 * GET /api/admin/prismatic/overview?tenant=prismatic&days=7
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantIdBySlug, isDbConfigured } from '@/lib/db'
import { getPrismaticOverview, getPrismaticFunnel, getPrismaticTrend } from '@/lib/db/prismatic'

const mockTenants: Record<string, string> = {
  prismatic: 'tenant_prismatic',
  zxqconsulting: 'tenant_001',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'prismatic'
  const days = parseInt(searchParams.get('days') || '7', 10)

  try {
    let tenantId: string | null = null

    if (isDbConfigured) {
      tenantId = await getTenantIdBySlug(tenantSlug)
      if (!tenantId) {
        // 自动注册
        tenantId = mockTenants[tenantSlug] ?? null
      }
    } else {
      tenantId = mockTenants[tenantSlug] ?? null
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const [overview, funnel, trend] = await Promise.all([
      getPrismaticOverview(tenantId, days),
      getPrismaticFunnel(tenantId, days),
      getPrismaticTrend(tenantId, days),
    ])

    return NextResponse.json({
      overview,
      funnel,
      trend,
    })
  } catch (error) {
    console.error('Prismatic overview API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
