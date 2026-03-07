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
        last_inquiry_at = ${new Date()},
        updated_at = ${new Date()}
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
       ${data.target_market ?? null}, ${data.source ?? 'website'}, 1, ${new Date()}, ${new Date()})
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

// 插入工具交互（支持 AI Chat）
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
  module?: string
  user_message?: string
  ai_message?: string
}) {
  if (!sql) return null

  await sql`
    INSERT INTO public.tool_interactions
      (tenant_id, visitor_id, session_id, tool_name, tool_section, action, input_params, output_result, duration_ms, step_completed, total_steps, module, user_message, ai_message)
    VALUES
      (${data.tenant_id}, ${data.visitor_id ?? null}, ${data.session_id ?? null}, ${data.tool_name},
       ${data.tool_section ?? null}, ${data.action}, ${JSON.stringify(data.input_params ?? {})},
       ${JSON.stringify(data.output_result ?? {})}, ${data.duration_ms ?? null},
       ${data.step_completed ?? null}, ${data.total_steps ?? null},
       ${data.module ?? null}, ${data.user_message ?? null}, ${data.ai_message ?? null})
  `
}

// 插入 AI Chat 消息
export async function insertChatMessage(data: {
  tenant_id: string
  visitor_id?: string
  session_id?: string
  module: string
  user_message: string
  ai_message?: string
}) {
  if (!sql) return null

  const rows = await sql`
    INSERT INTO public.chat_histories
      (tenant_id, visitor_id, session_id, role, content, divination_type)
    VALUES
      (${data.tenant_id}, ${data.visitor_id ?? null}, ${data.session_id ?? null}, 'user', ${data.user_message}, ${data.module}),
      (${data.tenant_id}, ${data.visitor_id ?? null}, ${data.session_id ?? null}, 'assistant', ${data.ai_message ?? ''}, ${data.module})
    RETURNING id
  `
  return rows[0] ?? null
}

// 更新或创建用户画像标签
export async function upsertUserTag(data: {
  tenant_id: string
  visitor_id?: string
  user_id?: string
  tag_type: string
  tag_name: string
  tag_value?: string
  confidence?: number
}) {
  if (!sql) return null

  // 先尝试查找现有标签
  const existing = await sql`
    SELECT id FROM public.user_tags
    WHERE tenant_id = ${data.tenant_id}
    AND visitor_id = ${data.visitor_id ?? null}
    AND tag_type = ${data.tag_type}
    AND tag_name = ${data.tag_name}
    LIMIT 1
  `

  if (existing[0]) {
    await sql`
      UPDATE public.user_tags SET
        tag_value = ${data.tag_value ?? null},
        confidence = ${data.confidence ?? 1.00},
        updated_at = ${new Date()}
      WHERE id = ${existing[0].id}
    `
    return existing[0].id
  }

  const inserted = await sql`
    INSERT INTO public.user_tags
      (tenant_id, visitor_id, user_id, tag_type, tag_name, tag_value, confidence)
    VALUES
      (${data.tenant_id}, ${data.visitor_id ?? null}, ${data.user_id ?? null}, ${data.tag_type}, ${data.tag_name}, ${data.tag_value ?? null}, ${data.confidence ?? 1.00})
    RETURNING id
  `
  return inserted[0]?.id ?? null
}

// 更新线索评分
export async function upsertLeadScore(data: {
  tenant_id: string
  visitor_id?: string
  user_id?: string
  score: number
  level: string
  factors?: unknown
  inquiry_count?: number
  tool_usage_count?: number
  page_views?: number
  avg_duration_seconds?: number
}) {
  if (!sql) return null

  // 先尝试查找现有评分
  const existing = await sql`
    SELECT id FROM public.lead_scores
    WHERE tenant_id = ${data.tenant_id}
    AND visitor_id = ${data.visitor_id ?? null}
    LIMIT 1
  `

  if (existing[0]) {
    await sql`
      UPDATE public.lead_scores SET
        score = ${data.score},
        level = ${data.level},
        factors = ${JSON.stringify(data.factors ?? {})},
        inquiry_count = COALESCE(${data.inquiry_count ?? null}, inquiry_count),
        tool_usage_count = COALESCE(${data.tool_usage_count ?? null}, tool_usage_count),
        page_views = COALESCE(${data.page_views ?? null}, page_views),
        avg_duration_seconds = COALESCE(${data.avg_duration_seconds ?? null}, avg_duration_seconds),
        updated_at = ${new Date()}
      WHERE id = ${existing[0].id}
    `
    return existing[0].id
  }

  const inserted = await sql`
    INSERT INTO public.lead_scores
      (tenant_id, visitor_id, user_id, score, level, factors, inquiry_count, tool_usage_count, page_views, avg_duration_seconds)
    VALUES
      (${data.tenant_id}, ${data.visitor_id ?? null}, ${data.user_id ?? null}, ${data.score}, ${data.level}, ${JSON.stringify(data.factors ?? {})}, ${data.inquiry_count ?? 0}, ${data.tool_usage_count ?? 0}, ${data.page_views ?? 0}, ${data.avg_duration_seconds ?? 0})
    RETURNING id
  `
  return inserted[0]?.id ?? null
}

// 插入用户档案
export async function upsertUserProfile(data: {
  tenant_id: string
  visitor_id?: string
  profile_id: string
  profile_type?: string
  name?: string
  avatar?: string
  birthday?: string
  birth_time?: string
  gender?: string
  profile_data?: unknown
  profile_completeness?: number
}) {
  if (!sql) return null

  const rows = await sql`
    INSERT INTO public.user_profiles
      (tenant_id, visitor_id, profile_id, profile_type, name, avatar, birthday, birth_time, gender, profile_data, profile_completeness)
    VALUES
      (${data.tenant_id}, ${data.visitor_id ?? null}, ${data.profile_id}, ${data.profile_type ?? 'default'}, ${data.name ?? null}, ${data.avatar ?? null}, ${data.birthday ?? null}, ${data.birth_time ?? null}, ${data.gender ?? null}, ${JSON.stringify(data.profile_data ?? {})}, ${data.profile_completeness ?? 0})
    ON CONFLICT (tenant_id, visitor_id, profile_id)
    DO UPDATE SET
      name = COALESCE(EXCLUDED.name, user_profiles.name),
      avatar = COALESCE(EXCLUDED.avatar, user_profiles.avatar),
      birthday = COALESCE(EXCLUDED.birthday, user_profiles.birthday),
      birth_time = COALESCE(EXCLUDED.birth_time, user_profiles.birth_time),
      gender = COALESCE(EXCLUDED.gender, user_profiles.gender),
      profile_data = EXCLUDED.profile_data,
      profile_completeness = GREATEST(user_profiles.profile_completeness, EXCLUDED.profile_completeness),
      updated_at = ${new Date()}
    RETURNING id
  `
  return rows[0]?.id ?? null
}

// 插入模块使用记录
export async function insertModuleUsage(data: {
  tenant_id: string
  visitor_id?: string
  session_id?: string
  module_id: string
  module_name?: string
  event_type: string
  conversation_turns?: number
  duration_seconds?: number
  input_params?: unknown
  output_result?: unknown
  completed_steps?: number
  total_steps?: number
}) {
  if (!sql) return null

  const rows = await sql`
    INSERT INTO public.module_usage
      (tenant_id, visitor_id, session_id, module_id, module_name, event_type, conversation_turns, duration_seconds, input_params, output_result, completed_steps, total_steps)
    VALUES
      (${data.tenant_id}, ${data.visitor_id ?? null}, ${data.session_id ?? null}, ${data.module_id}, ${data.module_name ?? null}, ${data.event_type}, ${data.conversation_turns ?? 0}, ${data.duration_seconds ?? null}, ${JSON.stringify(data.input_params ?? {})}, ${JSON.stringify(data.output_result ?? {})}, ${data.completed_steps ?? 0}, ${data.total_steps ?? null})
    RETURNING id
  `
  return rows[0]?.id ?? null
}

// 更新用户偏好
export async function upsertUserPreference(data: {
  tenant_id: string
  visitor_id: string
  preference_key: string
  preference_value: string
}) {
  if (!sql) return null

  const rows = await sql`
    INSERT INTO public.user_preferences
      (tenant_id, visitor_id, preference_key, preference_value)
    VALUES
      (${data.tenant_id}, ${data.visitor_id}, ${data.preference_key}, ${data.preference_value})
    ON CONFLICT (tenant_id, visitor_id, preference_key)
    DO UPDATE SET
      preference_value = EXCLUDED.preference_value,
      updated_at = ${new Date()}
    RETURNING id
  `
  return rows[0]?.id ?? null
}

// 更新用户生命周期
export async function upsertUserLifecycle(data: {
  tenant_id: string
  visitor_id: string
  lifecycle_stage: string
  last_visit_at?: string
  visit_count_increment?: number
  duration_seconds_increment?: number
}) {
  if (!sql) return null

  const now = new Date()
  const rows = await sql`
    INSERT INTO public.user_lifecycle
      (tenant_id, visitor_id, lifecycle_stage, first_visit_at, last_visit_at, visit_count, total_duration_seconds, inactive_days)
    VALUES
      (${data.tenant_id}, ${data.visitor_id}, ${data.lifecycle_stage}, ${now}, ${data.last_visit_at ?? now}, ${data.visit_count_increment ?? 1}, ${data.duration_seconds_increment ?? 0}, 0)
    ON CONFLICT (tenant_id, visitor_id)
    DO UPDATE SET
      lifecycle_stage = EXCLUDED.lifecycle_stage,
      last_visit_at = EXCLUDED.last_visit_at,
      visit_count = user_lifecycle.visit_count + ${data.visit_count_increment ?? 1},
      total_duration_seconds = user_lifecycle.total_duration_seconds + ${data.duration_seconds_increment ?? 0},
      inactive_days = 0,
      stage_changed_at = ${now},
      updated_at = ${now}
    RETURNING id
  `
  return rows[0]?.id ?? null
}

// 插入或更新 RFM 分析
export async function upsertRfmAnalysis(data: {
  tenant_id: string
  visitor_id: string
  r_score: number
  f_score: number
  m_score: number
  rfm_segment: string
}) {
  if (!sql) return null

  const rfmScore = data.r_score + data.f_score + data.m_score

  const rows = await sql`
    INSERT INTO public.rfm_analysis
      (tenant_id, visitor_id, r_score, f_score, m_score, rfm_score, rfm_segment)
    VALUES
      (${data.tenant_id}, ${data.visitor_id}, ${data.r_score}, ${data.f_score}, ${data.m_score}, ${rfmScore}, ${data.rfm_segment})
    ON CONFLICT (tenant_id, visitor_id)
    DO UPDATE SET
      r_score = EXCLUDED.r_score,
      f_score = EXCLUDED.f_score,
      m_score = EXCLUDED.m_score,
      rfm_score = EXCLUDED.rfm_score,
      rfm_segment = EXCLUDED.rfm_segment,
      calculated_at = ${new Date()}
    RETURNING id
  `
  return rows[0]?.id ?? null
}

// 插入对话会话
export async function insertConversationSession(data: {
  tenant_id: string
  visitor_id?: string
  session_id?: string
  module_id: string
  profile_id?: string
}) {
  if (!sql) return null

  const rows = await sql`
    INSERT INTO public.conversation_sessions
      (tenant_id, visitor_id, session_id, module_id, profile_id)
    VALUES
      (${data.tenant_id}, ${data.visitor_id ?? null}, ${data.session_id ?? null}, ${data.module_id}, ${data.profile_id ?? null})
    RETURNING id
  `
  return rows[0]?.id ?? null
}

// 更新对话会话
export async function updateConversationSession(data: {
  session_id: string
  duration_seconds?: number
  message_count?: number
  user_message_count?: number
  ai_message_count?: number
  contains_image?: boolean
  completed?: boolean
  abandoned?: boolean
}) {
  if (!sql) return null

  await sql`
    UPDATE public.conversation_sessions SET
      ended_at = CASE WHEN ${data.completed ?? false} OR ${data.abandoned ?? false} THEN ${new Date()} ELSE ended_at END,
      duration_seconds = COALESCE(${data.duration_seconds ?? null}, duration_seconds),
      message_count = COALESCE(${data.message_count ?? null}, message_count),
      user_message_count = COALESCE(${data.user_message_count ?? null}, user_message_count),
      ai_message_count = COALESCE(${data.ai_message_count ?? null}, ai_message_count),
      contains_image = COALESCE(${data.contains_image ?? null}, contains_image),
      completed = COALESCE(${data.completed ?? null}, completed),
      abandoned_at = CASE WHEN ${data.abandoned ?? false} THEN ${new Date()} ELSE abandoned_at END
    WHERE id = ${data.session_id}
  `
}

// 更新内容热度
export async function upsertContentAnalytics(data: {
  tenant_id: string
  content_type: string
  content_id: string
  content_name?: string
  view_increment?: number
  unique_viewer_increment?: number
  duration_seconds_increment?: number
  interaction_increment?: number
}) {
  if (!sql) return null

  const rows = await sql`
    INSERT INTO public.content_analytics
      (tenant_id, content_type, content_id, content_name, view_count, unique_viewers, avg_duration_seconds, interaction_count)
    VALUES
      (${data.tenant_id}, ${data.content_type}, ${data.content_id}, ${data.content_name ?? null}, ${data.view_increment ?? 1}, ${data.unique_viewer_increment ?? 1}, ${data.duration_seconds_increment ?? 0}, ${data.interaction_increment ?? 0})
    ON CONFLICT (tenant_id, content_type, content_id)
    DO UPDATE SET
      view_count = content_analytics.view_count + ${data.view_increment ?? 1},
      unique_viewers = content_analytics.unique_viewers + ${data.unique_viewer_increment ?? 0},
      avg_duration_seconds = ROUND((content_analytics.avg_duration_seconds * content_analytics.view_count + ${data.duration_seconds_increment ?? 0}) / (content_analytics.view_count + 1)),
      interaction_count = content_analytics.interaction_count + ${data.interaction_increment ?? 0},
      last_viewed_at = ${new Date()},
      updated_at = ${new Date()}
    RETURNING id
  `
  return rows[0]?.id ?? null
}
