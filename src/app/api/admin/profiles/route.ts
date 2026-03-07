/**
 * 用户档案 API
 * 支持多档案管理（如 zero2 的命理档案）
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'

// Mock 数据（当数据库未配置时使用）
const mockProfiles = [
  { id: '1', profile_id: 'profile_1', profile_type: 'bazi', name: '张三', birthday: '1990-05-15', gender: '男', profile_completeness: 85 },
  { id: '2', profile_id: 'profile_2', profile_type: 'default', name: '李四', birthday: '1985-08-20', gender: '女', profile_completeness: 60 },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'zxqconsulting'
  const visitorId = searchParams.get('visitor_id')
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const offset = Number(searchParams.get('offset') ?? 0)

  if (!isDbConfigured || !sql) {
    return NextResponse.json({
      data: visitorId ? mockProfiles.filter(p => p.id === visitorId) : mockProfiles,
      total: mockProfiles.length,
    })
  }

  try {
    const tenantRows = await sql`SELECT id FROM public.tenants WHERE slug=${tenantSlug} LIMIT 1`
    const tenantId = tenantRows[0]?.id
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    let rows
    let total

    if (visitorId) {
      rows = await sql`
        SELECT id, visitor_id, profile_id, profile_type, name, avatar, birthday, birth_time, gender, profile_data, profile_completeness, is_active, created_at, updated_at
        FROM public.user_profiles
        WHERE tenant_id=${tenantId} AND visitor_id=${visitorId}
        ORDER BY updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      total = await sql`SELECT COUNT(*) AS cnt FROM public.user_profiles WHERE tenant_id=${tenantId} AND visitor_id=${visitorId}`
    } else {
      rows = await sql`
        SELECT id, visitor_id, profile_id, profile_type, name, avatar, birthday, birth_time, gender, profile_data, profile_completeness, is_active, created_at, updated_at
        FROM public.user_profiles
        WHERE tenant_id=${tenantId}
        ORDER BY updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      total = await sql`SELECT COUNT(*) AS cnt FROM public.user_profiles WHERE tenant_id=${tenantId}`
    }

    return NextResponse.json({
      data: rows.map(r => ({
        id: r.id,
        visitorId: r.visitor_id,
        profileId: r.profile_id,
        profileType: r.profile_type,
        name: r.name,
        avatar: r.avatar,
        birthday: r.birthday,
        birthTime: r.birth_time,
        gender: r.gender,
        profileData: r.profile_data,
        profileCompleteness: r.profile_completeness,
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      total: Number(total[0]?.cnt ?? 0),
    })
  } catch (error) {
    console.error('Profiles API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenant_slug, visitor_id, profile_id, profile_type, name, avatar, birthday, birth_time, gender, profile_data } = body

    if (!tenant_slug || !visitor_id || !profile_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!isDbConfigured || !sql) {
      return NextResponse.json({ success: true, mock: true })
    }

    const tenantRows = await sql`SELECT id FROM public.tenants WHERE slug=${tenant_slug} LIMIT 1`
    const tenantId = tenantRows[0]?.id
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    // 计算档案完整度
    let completeness = 0
    if (name) completeness += 20
    if (birthday) completeness += 30
    if (birth_time) completeness += 10
    if (gender) completeness += 10
    if (profile_data && Object.keys(profile_data).length > 0) completeness += 30

    await sql`
      INSERT INTO public.user_profiles (tenant_id, visitor_id, profile_id, profile_type, name, avatar, birthday, birth_time, gender, profile_data, profile_completeness)
      VALUES (${tenantId}, ${visitor_id}, ${profile_id}, ${profile_type ?? 'default'}, ${name ?? null}, ${avatar ?? null}, ${birthday ?? null}, ${birth_time ?? null}, ${gender ?? null}, ${JSON.stringify(profile_data ?? {})}, ${completeness})
      ON CONFLICT (tenant_id, visitor_id, profile_id)
      DO UPDATE SET
        name = COALESCE(EXCLUDED.name, user_profiles.name),
        avatar = COALESCE(EXCLUDED.avatar, user_profiles.avatar),
        birthday = COALESCE(EXCLUDED.birthday, user_profiles.birthday),
        birth_time = COALESCE(EXCLUDED.birth_time, user_profiles.birth_time),
        gender = COALESCE(EXCLUDED.gender, user_profiles.gender),
        profile_data = EXCLUDED.profile_data,
        profile_completeness = GREATEST(user_profiles.profile_completeness, EXCLUDED.profile_completeness),
        updated_at = NOW()
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profiles API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
