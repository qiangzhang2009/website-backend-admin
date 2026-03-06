/**
 * 多租户核心模块
 * 负责租户识别、上下文管理和数据隔离
 */

import { headers } from 'next/headers'

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
  
  // 方式1: 从自定义头获取租户slug (推荐)
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

// 根据slug获取租户
async function fetchTenantBySlug(slug: string): Promise<TenantContext | null> {
  // 这里应该查询数据库
  // 暂时返回模拟数据，后续连接Supabase
  const mockTenants: Record<string, TenantContext> = {
    'zxqconsulting': {
      id: 'tenant_001',
      name: '张小强企业咨询',
      slug: 'zxqconsulting',
      domain: 'www.zxqconsulting.com',
      settings: {
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        features: {
          userProfile: true,
          inquiry: true,
          analytics: true,
          tools: true
        }
      }
    },
    'demo': {
      id: 'tenant_002',
      name: '演示站点',
      slug: 'demo',
      settings: {
        timezone: 'UTC',
        language: 'en-US',
        features: {
          userProfile: true,
          inquiry: true,
          analytics: false,
          tools: false
        }
      }
    }
  }
  
  return mockTenants[slug] || null
}

// 根据域名获取租户
async function fetchTenantByDomain(domain: string): Promise<TenantContext | null> {
  const mockTenants: Record<string, TenantContext> = {
    'www.zxqconsulting.com': {
      id: 'tenant_001',
      name: '张小强企业咨询',
      slug: 'zxqconsulting',
      domain: 'www.zxqconsulting.com',
      settings: {
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        features: {
          userProfile: true,
          inquiry: true,
          analytics: true,
          tools: true
        }
      }
    }
  }
  
  return mockTenants[domain] || null
}

// 租户ID生成器
export function generateTenantId(slug: string): string {
  return `tenant_${slug}_${Date.now()}`
}

// RLS策略辅助函数 - 用于构建安全的查询
export function buildTenantQuery(tableName: string, tenantId: string): string {
  return `${tableName}.tenant_id = '${tenantId}'`
}
