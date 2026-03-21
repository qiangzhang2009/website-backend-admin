/**
 * 用户分群 API
 * 基于行为数据和画像进行智能分群
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

// 预设分群规则
const SEGMENT_RULES = {
  'high-value': {
    name: '高价值客户',
    description: '高消费力 + 高意向',
    color: '#10b981',
    conditions: [
      { field: 'purchase_power_score', operator: 'gte', value: 70 },
      { field: 'intent_score', operator: 'gte', value: 60 },
    ]
  },
  'at-risk': {
    name: '流失风险',
    description: '30天未访问的活跃用户',
    color: '#ef4444',
    conditions: [
      { field: 'last_visit_days', operator: 'gte', value: 30 },
      { field: 'page_views', operator: 'gte', value: 5 },
    ]
  },
  'new-visitors': {
    name: '新访客',
    description: '7天内首次访问',
    color: '#3b82f6',
    conditions: [
      { field: 'first_visit_days', operator: 'lte', value: 7 },
    ]
  },
  'active-users': {
    name: '活跃用户',
    description: '30天内访问超过10次',
    color: '#8b5cf6',
    conditions: [
      { field: 'visit_count', operator: 'gte', value: 10 },
    ]
  },
  'tool-enthusiasts': {
    name: '工具爱好者',
    description: '使用超过3种工具',
    color: '#f59e0b',
    conditions: [
      { field: 'unique_tools', operator: 'gte', value: 3 },
    ]
  },
  'lead-prospects': {
    name: '线索潜客',
    description: '提交过询盘但未转化',
    color: '#ec4899',
    conditions: [
      { field: 'inquiry_count', operator: 'gte', value: 1 },
      { field: 'converted', operator: 'eq', value: false },
    ]
  },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 401 })
  }

  if (!isDbConfigured || !sql) {
    return NextResponse.json({ segments: [], error: 'Database not configured' })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) {
      return NextResponse.json({ segments: [] })
    }

    const days = Math.min(Number(searchParams.get('days') ?? 30), 90)

    const since = new Date()
    since.setDate(since.getDate() - days)

    // 获取用户行为汇总数据
    const userData = await sql`
      SELECT 
        u.id,
        u.visitor_id,
        u.name,
        u.email,
        u.company,
        u.visit_count,
        u.inquiry_count,
        u.last_visit_at,
        u.created_at as first_visit,
        COALESCE(ti.tool_count, 0) as tool_count,
        COALESCE(ti.unique_tools, 0) as unique_tools,
        COALESCE(ti.completed_tools, 0) as completed_tools,
        COALESCE(pv.page_views, 0) as page_views,
        COALESCE(pv.avg_duration, 0) as avg_duration_seconds
      FROM public.users u
      LEFT JOIN (
        SELECT 
          visitor_id,
          COUNT(*) as tool_count,
          COUNT(DISTINCT tool_name) as unique_tools,
          COUNT(CASE WHEN action IN ('complete', 'submit') THEN 1 END) as completed_tools
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId}
        GROUP BY visitor_id
      ) ti ON ti.visitor_id = u.visitor_id
      LEFT JOIN (
        SELECT 
          visitor_id,
          COUNT(*) as page_views,
          AVG(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))) as avg_duration
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
        AND created_at >= ${since.toISOString()}
        GROUP BY visitor_id
      ) pv ON pv.visitor_id = u.visitor_id
      WHERE u.tenant_id = ${tenantId}
      ORDER BY u.last_visit_at DESC NULLS LAST
    `

    // 计算每个用户的画像分数
    const userProfiles = userData.map(u => {
      const visitDaysAgo = u.last_visit_at 
        ? Math.floor((Date.now() - new Date(u.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999
      
      const firstVisitDaysAgo = u.first_visit
        ? Math.floor((Date.now() - new Date(u.first_visit).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      // 简化的消费力评分 (基于行为)
      let purchasePowerScore = 50
      if (u.completed_tools >= 3) purchasePowerScore += 20
      if (u.avg_duration_seconds > 300) purchasePowerScore += 15
      if (u.page_views > 20) purchasePowerScore += 15
      purchasePowerScore = Math.min(purchasePowerScore, 100)

      // 简化的意向评分
      let intentScore = 20
      if (u.inquiry_count > 0) intentScore += 40
      if (u.tool_count > 0) intentScore += 20
      if (u.page_views > 5) intentScore += 15
      if (visitDaysAgo < 7) intentScore += 5
      intentScore = Math.min(intentScore, 100)

      return {
        id: String(u.id),
        visitor_id: u.visitor_id,
        name: u.name || '匿名',
        email: u.email,
        company: u.company,
        visit_count: Number(u.visit_count) || 0,
        inquiry_count: Number(u.inquiry_count) || 0,
        tool_count: Number(u.tool_count) || 0,
        unique_tools: Number(u.unique_tools) || 0,
        completed_tools: Number(u.completed_tools) || 0,
        page_views: Number(u.page_views) || 0,
        avg_duration_seconds: Math.round(Number(u.avg_duration_seconds) || 0),
        last_visit_days: visitDaysAgo,
        first_visit_days: firstVisitDaysAgo,
        purchase_power_score: purchasePowerScore,
        intent_score: intentScore,
        converted: (u.inquiry_count || 0) > 0,
      }
    })

    // 应用分群规则
    const segments: Record<string, typeof userProfiles> = {}
    
    for (const [segmentKey, segmentDef] of Object.entries(SEGMENT_RULES)) {
      const segmentUsers = userProfiles.filter(user => {
        return segmentDef.conditions.every(condition => {
          const value = user[condition.field as keyof typeof user]
          const numValue = Number(value)
          switch (condition.operator) {
            case 'gte': return numValue >= Number(condition.value)
            case 'lte': return numValue <= Number(condition.value)
            case 'eq': return value === condition.value
            case 'gt': return numValue > Number(condition.value)
            case 'lt': return numValue < Number(condition.value)
            default: return true
          }
        })
      })
      segments[segmentKey] = segmentUsers
    }

    // 构建响应
    const responseSegments = Object.entries(SEGMENT_RULES).map(([key, def]) => ({
      key,
      name: def.name,
      description: def.description,
      color: def.color,
      count: segments[key]?.length || 0,
      users: segments[key]?.slice(0, 10).map(u => ({
        visitor_id: u.visitor_id,
        name: u.name,
        email: u.email,
        company: u.company,
        visit_count: u.visit_count,
        inquiry_count: u.inquiry_count,
        intent_score: u.intent_score,
      })) || [],
    }))

    // 汇总统计
    const summary = {
      totalUsers: userProfiles.length,
      segments: responseSegments.map(s => ({
        key: s.key,
        name: s.name,
        count: s.count,
      })),
    }

    return NextResponse.json({
      segments: responseSegments,
      summary,
      segmentRules: SEGMENT_RULES,
    })
  } catch (error) {
    console.error('User segmentation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
