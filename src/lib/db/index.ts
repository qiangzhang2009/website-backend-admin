/**
 * Neon PostgreSQL 数据库连接
 * 替代 Supabase，用于后端 API 和服务端逻辑
 */

import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL || ''

if (!databaseUrl) {
  console.warn('DATABASE_URL not configured, database operations will fail')
}

// 创建 SQL 查询函数
export const sql = databaseUrl ? neon(databaseUrl) : null

// 判断数据库是否已配置
export const isDbConfigured = !!databaseUrl

// 从 slug 获取租户 ID
export async function getTenantIdBySlug(slug: string): Promise<string | null> {
  if (!sql) return null

  try {
    const rows = await sql`
      SELECT id FROM public.tenants WHERE slug = ${slug} LIMIT 1
    `
    return rows[0]?.id ?? null
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return null
  }
}

// 插入追踪事件
export async function insertTrackingEvent(data: {
  tenant_id: string
  event_type: string
  session_id?: string
  visitor_id?: string
  website_url?: string
  page_url?: string
  page_title?: string
  referrer?: string
  user_agent?: string
  event_data?: unknown
}) {
  if (!sql) return null

  const rows = await sql`
    INSERT INTO public.tracking_events
      (tenant_id, event_type, session_id, visitor_id, website_url, page_url, page_title, referrer, user_agent, event_data)
    VALUES
      (${data.tenant_id}, ${data.event_type}, ${data.session_id ?? null}, ${data.visitor_id ?? null},
       ${data.website_url ?? null}, ${data.page_url ?? null}, ${data.page_title ?? null},
       ${data.referrer ?? null}, ${data.user_agent ?? null}, ${JSON.stringify(data.event_data ?? {})})
    RETURNING id
  `
  return rows[0] ?? null
}

// 查询或创建用户
export async function upsertUser(data: {
  tenant_id: string
  visitor_id?: string
  name?: string
  phone?: string
  email?: string
  company?: string
  product_type?: string
  target_market?: string
  source?: string
}) {
  if (!sql) return null

  // 先尝试查找
  const existing = await sql`
    SELECT id FROM public.users
    WHERE tenant_id = ${data.tenant_id} AND visitor_id = ${data.visitor_id ?? null}
    LIMIT 1
  `

  if (existing[0]) {
    await sql`
      UPDATE public.users SET
        name = COALESCE(${data.name ?? null}, name),
        phone = COALESCE(${data.phone ?? null}, phone),
        email = COALESCE(${data.email ?? null}, email),
        company = COALESCE(${data.company ?? null}, company),
        product_type = COALESCE(${data.product_type ?? null}, product_type),
        target_market = COALESCE(${data.target_market ?? null}, target_market),
        last_inquiry_at = NOW(),
        updated_at = NOW()
      WHERE id = ${existing[0].id}
    `
    return existing[0].id as string
  }

  const inserted = await sql`
    INSERT INTO public.users
      (tenant_id, visitor_id, name, phone, email, company, product_type, target_market, source, inquiry_count, first_inquiry_at, last_inquiry_at)
    VALUES
      (${data.tenant_id}, ${data.visitor_id ?? null}, ${data.name ?? null}, ${data.phone ?? null},
       ${data.email ?? null}, ${data.company ?? null}, ${data.product_type ?? null},
       ${data.target_market ?? null}, ${data.source ?? 'website'}, 1, NOW(), NOW())
    RETURNING id
  `
  return inserted[0]?.id as string ?? null
}

// 插入询盘
export async function insertInquiry(data: {
  tenant_id: string
  user_id?: string
  visitor_id?: string
  name?: string
  phone?: string
  email?: string
  company?: string
  product_type?: string
  target_market?: string
  message?: string
  source?: string
}) {
  if (!sql) return null

  const rows = await sql`
    INSERT INTO public.inquiries
      (tenant_id, user_id, visitor_id, name, phone, email, company, product_type, target_market, message, source, status)
    VALUES
      (${data.tenant_id}, ${data.user_id ?? null}, ${data.visitor_id ?? null}, ${data.name ?? null},
       ${data.phone ?? null}, ${data.email ?? null}, ${data.company ?? null}, ${data.product_type ?? null},
       ${data.target_market ?? null}, ${data.message ?? null}, ${data.source ?? 'website_form'}, 'pending')
    RETURNING id
  `
  return rows[0] ?? null
}

// 插入工具交互
export async function insertToolInteraction(data: {
  tenant_id: string
  visitor_id?: string
  session_id?: string
  tool_name: string
  tool_section?: string
  action: string
  input_params?: unknown
  output_result?: unknown
  duration_ms?: number
  step_completed?: number
  total_steps?: number
}) {
  if (!sql) return null

  await sql`
    INSERT INTO public.tool_interactions
      (tenant_id, visitor_id, session_id, tool_name, tool_section, action, input_params, output_result, duration_ms, step_completed, total_steps)
    VALUES
      (${data.tenant_id}, ${data.visitor_id ?? null}, ${data.session_id ?? null}, ${data.tool_name},
       ${data.tool_section ?? null}, ${data.action}, ${JSON.stringify(data.input_params ?? {})},
       ${JSON.stringify(data.output_result ?? {})}, ${data.duration_ms ?? null},
       ${data.step_completed ?? null}, ${data.total_steps ?? null})
  `
}
