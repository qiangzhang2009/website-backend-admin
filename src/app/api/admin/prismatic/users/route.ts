/**
 * Prismatic Analytics - 访客画像 API
 * GET /api/admin/prismatic/users?tenant=prismatic&limit=100
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantIdBySlug, isDbConfigured } from '@/lib/db'
import { getPrismaticVisitorProfiles, getPrismaticDeviceStats, getPrismaticTrend } from '@/lib/db/prismatic'

const mockTenants: Record<string, string> = {
  prismatic: 'tenant_prismatic',
  zxqconsulting: 'tenant_001',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'prismatic'
  const days = parseInt(searchParams.get('days') || '30', 10)
  const limit = parseInt(searchParams.get('limit') || '100', 10)

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

    const [visitors, devices, geo] = await Promise.all([
      getPrismaticVisitorProfiles(tenantId, limit),
      getPrismaticDeviceStats(tenantId, days),
      getPrismaticTrend(tenantId, days),
    ])

    return NextResponse.json({
      visitors,
      devices,
      geo,
    })
  } catch (error) {
    console.error('Prismatic users API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
