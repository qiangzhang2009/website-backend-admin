/**
 * 导出 API
 * 支持导出询盘和用户数据为 CSV 格式
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant')
  const type = searchParams.get('type') // inquiries | users

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

      // CSV 表头
      csvContent = 'ID,姓名,电话,邮箱,公司,产品类型,目标市场,需求描述,状态,优先级,负责人,来源,创建时间\n'

      // CSV 数据行
      for (const row of rows) {
        const fields = [
          row.id,
          row.name || '',
          row.phone || '',
          row.email || '',
          row.company || '',
          row.product_type || '',
          row.target_market || '',
          (row.message || '').replace(/"/g, '""'), // Escape quotes
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

      // CSV 表头
      csvContent = 'ID,VisitorID,姓名,电话,邮箱,公司,产品类型,目标市场,来源,询盘次数,访问次数,首次访问,最近访问,创建时间\n'

      // CSV 数据行
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
    } else {
      return NextResponse.json({ error: 'Invalid export type. Use "inquiries" or "users".' }, { status: 400 })
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
