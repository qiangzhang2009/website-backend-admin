/**
 * Supabase 服务端客户端
 * 用于后端API和Server Components
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { resolveTenantSlug } from '@/lib/tenant-resolve'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''

// 如果没有配置Supabase，使用mock模式
const isConfigured = !!(supabaseUrl && supabaseServiceKey)

if (!isConfigured) {
  console.warn('Supabase credentials not configured, using mock mode')
}

export const supabaseAdmin = isConfigured 
  ? createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

// 从slug获取租户ID
export async function getTenantIdBySlug(slug: string): Promise<string | null> {
  if (!supabaseAdmin) return null

  const canonical = resolveTenantSlug(slug) ?? slug

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', canonical)
    .single()

  if (error || !data) {
    console.error('Error fetching tenant:', error)
    return null
  }

  return data.id
}
