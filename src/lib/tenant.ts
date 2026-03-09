/**
 * 租户验证工具
 * 确保所有 API 请求都有有效的租户标识
 */

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

/**
 * 获取租户 ID
 * 如果租户 slug 无效，返回 null
 */
export async function getTenantId(tenantSlug: string | null): Promise<string | null> {
  if (!tenantSlug || !sql) return null
  
  try {
    const rows = await sql`SELECT id FROM public.tenants WHERE slug = ${tenantSlug} LIMIT 1`
    return rows[0]?.id ?? null
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return null
  }
}

/**
 * 租户验证中间件
 * 检查请求中是否提供了有效的租户参数
 * 如果无效，返回 401 错误
 */
export function withTenantValidation(
  handler: (tenantId: string, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get('tenant')
    
    // 如果没有提供租户参数，返回 401 错误
    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Missing tenant parameter. Please provide a valid tenant slug.' },
        { status: 401 }
      )
    }
    
    const tenantId = await getTenantId(tenantSlug)
    
    // 如果租户不存在，返回 404 错误
    if (!tenantId) {
      return NextResponse.json(
        { error: `Tenant not found: ${tenantSlug}` },
        { status: 404 }
      )
    }
    
    return handler(tenantId, request)
  }
}

/**
 * 从请求中获取租户 ID（同步版本）
 * 适用于已经验证过租户的请求
 */
export function getTenantIdFromParams(tenantSlug: string | null): string | null {
  // 这个函数需要在调用方使用 await getTenantId 获取到 tenantId 后传入
  // 这里主要用于类型提示
  return tenantSlug
}
