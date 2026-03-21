/**
 * 导出 API
 * 支持导出多种数据为 CSV 格式
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')
  const type = searchParams.get('type') // inquiries | users | leads | tools | traffic

  // 租户验证
  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenant parameter' },
      { status: 401 }
    )
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const tenantId = await getTenantId(tenantSlug)
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    let csvContent = ''
    let filename = ''

    if (type === 'inquiries') {
      // 导出询盘数据
      const rows = await sql`
        SELECT id, name, phone, email, company, product_type, target_market, 
               message, status, priority, assignee, source, created_at
        FROM public.inquiries
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `

      csvContent = 'ID,姓名,电话,邮箱,公司,产品类型,目标市场,需求描述,状态,优先级,负责人,来源,创建时间\n'

      for (const row of rows) {
        const fields = [
          row.id,
          row.name || '',
          row.phone || '',
          row.email || '',
          row.company || '',
          row.product_type || '',
          row.target_market || '',
          (row.message || '').replace(/"/g, '""'),
          row.status || '',
          row.priority || '',
          row.assignee || '',
          row.source || '',
          row.created_at || '',
        ]
        csvContent += fields.map(f => `"${f}"`).join(',') + '\n'
      }

      filename = `inquiries_${new Date().toISOString().split('T')[0]}.csv`

    } else if (type === 'users') {
      // 导出用户数据
      const rows = await sql`
        SELECT id, visitor_id, name, phone, email, company, product_type, 
               target_market, source, inquiry_count, visit_count, 
               first_visit_at, last_visit_at, created_at
        FROM public.users
        WHERE tenant_id = ${tenantId}
        ORDER BY last_visit_at DESC NULLS LAST
      `

      csvContent = 'ID,VisitorID,姓名,电话,邮箱,公司,产品类型,目标市场,来源,询盘次数,访问次数,首次访问,最近访问,创建时间\n'

      for (const row of rows) {
        const fields = [
          row.id,
          row.visitor_id || '',
          row.name || '',
          row.phone || '',
          row.email || '',
          row.company || '',
          row.product_type || '',
          row.target_market || '',
          row.source || '',
          row.inquiry_count || 0,
          row.visit_count || 0,
          row.first_visit_at || '',
          row.last_visit_at || '',
          row.created_at || '',
        ]
        csvContent += fields.map(f => `"${f}"`).join(',') + '\n'
      }

      filename = `users_${new Date().toISOString().split('T')[0]}.csv`

    } else if (type === 'leads') {
      // 导出线索数据
      const rows = await sql`
        SELECT id, visitor_id, name, phone, email, company, 
               product_type, target_market, score, level, 
               status, assigned_to, created_at, updated_at
        FROM public.leads
        WHERE tenant_id = ${tenantId}
        ORDER BY score DESC, created_at DESC
      `

      csvContent = 'ID,VisitorID,姓名,电话,邮箱,公司,产品类型,目标市场,评分,等级,状态,分配给,创建时间,更新时间\n'

      for (const row of rows) {
        const fields = [
          row.id,
          row.visitor_id || '',
          row.name || '',
          row.phone || '',
          row.email || '',
          row.company || '',
          row.product_type || '',
          row.target_market || '',
          row.score || 0,
          row.level || '',
          row.status || '',
          row.assigned_to || '',
          row.created_at || '',
          row.updated_at || '',
        ]
        csvContent += fields.map(f => `"${f}"`).join(',') + '\n'
      }

      filename = `leads_${new Date().toISOString().split('T')[0]}.csv`

    } else if (type === 'tools') {
      // 导出工具使用数据
      const rows = await sql`
        SELECT id, visitor_id, tool_name, action, input_data, output_data, 
               duration_seconds, conversation_turns, created_at
        FROM public.tool_interactions
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT 1000
      `

      csvContent = 'ID,VisitorID,工具名称,动作,输入数据,输出数据,时长(秒),对话轮次,创建时间\n'

      for (const row of rows) {
        const fields = [
          row.id,
          row.visitor_id || '',
          row.tool_name || '',
          row.action || '',
          (row.input_data || '').toString().substring(0, 100),
          (row.output_data || '').toString().substring(0, 100),
          row.duration_seconds || 0,
          row.conversation_turns || 0,
          row.created_at || '',
        ]
        csvContent += fields.map(f => `"${f.replace(/"/g, '""')}"`).join(',') + '\n'
      }

      filename = `tool_usage_${new Date().toISOString().split('T')[0]}.csv`

    } else if (type === 'traffic') {
      // 导出流量数据
      const rows = await sql`
        SELECT id, visitor_id, event_type, page_url, referrer, 
               device_type, browser, country, city, created_at
        FROM public.tracking_events
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT 1000
      `

      csvContent = 'ID,VisitorID,事件类型,页面URL,来源,设备类型,浏览器,国家,城市,创建时间\n'

      for (const row of rows) {
        const fields = [
          row.id,
          row.visitor_id || '',
          row.event_type || '',
          (row.page_url || '').toString().substring(0, 200),
          row.referrer || '',
          row.device_type || '',
          row.browser || '',
          row.country || '',
          row.city || '',
          row.created_at || '',
        ]
        csvContent += fields.map(f => `"${f.replace(/"/g, '""')}"`).join(',') + '\n'
      }

      filename = `traffic_${new Date().toISOString().split('T')[0]}.csv`

    } else {
      return NextResponse.json(
        { error: 'Invalid export type. Use: inquiries, users, leads, tools, or traffic.' },
        { status: 400 }
      )
    }

    // 返回 CSV 文件
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8;',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
