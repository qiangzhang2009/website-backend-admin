/**
 * 输入验证工具
 * 用于验证 API 请求参数
 */

import { z } from 'zod'
import { NextRequest } from 'next/server'

// 常用验证规则
export const commonSchemas = {
  // 分页参数
  pagination: z.object({
    limit: z.coerce.number().min(1).max(200).default(50),
    offset: z.coerce.number().min(0).default(0),
  }),

  // 租户 slug
  tenantSlug: z.string().min(1, 'Missing tenant parameter').max(100, 'Tenant slug too long'),

  // UUID
  uuid: z.string().uuid('Invalid UUID format'),

  // 日期字符串
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),

  // 邮箱
  email: z.string().email('Invalid email format').optional(),

  // 电话号码
  phone: z.string().regex(/^[\d\s\-+()]*$/, 'Invalid phone format').optional(),

  // 搜索关键词
  searchKeyword: z.string().max(200, 'Search keyword too long').optional(),

  // 状态
  status: z.enum(['pending', 'following', 'completed', 'failed']).optional(),
}

// 询盘相关验证
export const inquirySchemas = {
  create: z.object({
    name: z.string().max(100).optional(),
    phone: commonSchemas.phone,
    email: commonSchemas.email,
    company: z.string().max(200).optional(),
    product_type: z.string().max(100).optional(),
    target_market: z.string().max(100).optional(),
    message: z.string().max(2000).optional(),
    source: z.string().max(50).optional(),
  }),

  update: z.object({
    id: commonSchemas.uuid,
    status: commonSchemas.status,
    priority: z.enum(['high', 'medium', 'low']).optional(),
    assignee: z.string().max(100).optional(),
  }),
}

// 用户相关验证
export const userSchemas = {
  search: z.object({
    search: commonSchemas.searchKeyword,
  }),
}

// 追踪事件验证
export const trackingSchemas = {
  event: z.object({
    event_type: z.string().min(1, 'Missing event_type').max(50),
    tenant_slug: z.string().min(1, 'Missing tenant_slug').max(100),
    session_id: z.string().max(100).optional(),
    visitor_id: z.string().max(100).optional(),
    timestamp: z.string().min(1, 'Missing timestamp'),
    website_url: z.string().url().optional(),
    page_url: z.string().url().optional(),
    page_title: z.string().max(500).optional(),
    referrer: z.string().url().optional(),
    user_agent: z.string().max(500).optional(),
    event_data: z.record(z.string(), z.unknown()).optional(),
  }),
}

/**
 * 验证函数
 * @param schema Zod schema
 * @param data 要验证的数据
 * @returns 验证结果，如果是无效的，返回错误信息
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = (error as any).issues || (error as any).errors
      const messages = issues?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || 'Validation failed'
      return { success: false, error: messages }
    }
    return { success: false, error: 'Validation error' }
  }
}

/**
 * 从 NextRequest 获取并验证查询参数
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, request: NextRequest): { success: true; data: T } | { success: false; error: string; status: number } {
  const { searchParams } = new URL(request.url)
  const params: Record<string, unknown> = {}
  
  for (const [key, value] of searchParams.entries()) {
    params[key] = value
  }
  
  const result = validate(schema, params)
  if (!result.success) {
    return { success: false, error: result.error, status: 400 }
  }
  return { success: true, data: result.data }
}
