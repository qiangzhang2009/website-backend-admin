/**
 * 多租户核心模块
 * 负责租户识别、上下文管理和数据隔离（从数据库 public.tenants 读取）
 */

import { headers } from 'next/headers'
import { sql, isDbConfigured } from '@/lib/db'

// 租户上下文接口
export interface TenantContext {
  id: string
  name: string
  slug: string
  domain?: string
  settings: TenantSettings
}

export interface TenantSettings {
  timezone: string
  language: string
  features: Record<string, boolean>
}

// 从请求中获取租户信息
export async function getTenantContext(): Promise<TenantContext | null> {
  const headersList = await headers()

  // 方式1: 从自定义头获取租户 slug (推荐)
  const tenantSlug = headersList.get('x-tenant-slug')
  if (tenantSlug) {
    return await fetchTenantBySlug(tenantSlug)
  }

  // 方式2: 从域名获取租户
  const host = headersList.get('host')
  if (host) {
    return await fetchTenantByDomain(host)
  }

  return null
}

// 数据库租户行类型
type TenantRow = {
  id: string
  name: string
  slug: string
  domain: string | null
  timezone: string
  language: string
  settings: { features?: Record<string, boolean> } | null
}

function rowToContext(row: TenantRow): TenantContext {
  const settings = row.settings ?? {}
  const features = settings.features ?? {}
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    domain: row.domain ?? undefined,
    settings: {
      timezone: row.timezone ?? 'Asia/Shanghai',
      language: row.language ?? 'zh-CN',
      features: typeof features === 'object' ? features : {},
    },
  }
}

// 根据 slug 从数据库获取租户
async function fetchTenantBySlug(slug: string): Promise<TenantContext | null> {
  if (!isDbConfigured || !sql) return null
  try {
    const rows = await sql`
      SELECT id, name, slug, domain, timezone, language, settings
      FROM public.tenants
      WHERE slug = ${slug}
      LIMIT 1
    `
    const row = rows[0] as TenantRow | undefined
    return row ? rowToContext(row) : null
  } catch (error) {
    console.error('Error fetching tenant by slug:', error)
    return null
  }
}

// 根据域名从数据库获取租户
async function fetchTenantByDomain(domain: string): Promise<TenantContext | null> {
  if (!isDbConfigured || !sql) return null
  try {
    const rows = await sql`
      SELECT id, name, slug, domain, timezone, language, settings
      FROM public.tenants
      WHERE domain IS NOT NULL AND domain = ${domain}
      LIMIT 1
    `
    const row = rows[0] as TenantRow | undefined
    return row ? rowToContext(row) : null
  } catch (error) {
    console.error('Error fetching tenant by domain:', error)
    return null
  }
}

// 租户ID生成器
export function generateTenantId(slug: string): string {
  return `tenant_${slug}_${Date.now()}`
}

// RLS策略辅助函数 - 用于构建安全的查询
export function buildTenantQuery(tableName: string, tenantId: string): string {
  return `${tableName}.tenant_id = '${tenantId}'`
}
