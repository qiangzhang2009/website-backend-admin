import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const tenant = searchParams.get('tenant');

    if (!tenant) {
      return NextResponse.json({ error: 'tenant parameter required' }, { status: 400 });
    }

    // Get tenant ID
    const tenantResult = await sql`
      SELECT id, slug FROM public.tenants WHERE slug = ${tenant}
    `;

    if (tenantResult.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantId = tenantResult[0].id;

    // Get row counts for various tables
    const trackingCount = await sql`
      SELECT COUNT(*) as count FROM public.tracking_events WHERE tenant_id = ${tenantId}
    `;

    const toolInteractionsCount = await sql`
      SELECT COUNT(*) as count FROM public.tool_interactions WHERE tenant_id = ${tenantId}
    `;

    const usersCount = await sql`
      SELECT COUNT(*) as count FROM public.users WHERE tenant_id = ${tenantId}
    `;

    const inquiriesCount = await sql`
      SELECT COUNT(*) as count FROM public.inquiries WHERE tenant_id = ${tenantId}
    `;

    // Get database size (PostgreSQL)
    const dbSize = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;

    // Get table sizes - PostgreSQL compatible query
    const tableSizes = await sql`
      SELECT 
        schemaname,
        relname as tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as size,
        n_live_tup as row_count
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC
      LIMIT 10
    `;

    return NextResponse.json({
      database: dbSize[0]?.size || 'unknown',
      tables: tableSizes.map((t: any) => ({
        name: t.tablename,
        size: t.size,
        rows: Number(t.row_count) || 0
      })),
      records: {
        tracking_events: Number(trackingCount[0]?.count || 0),
        tool_interactions: Number(toolInteractionsCount[0]?.count || 0),
        users: Number(usersCount[0]?.count || 0),
        inquiries: Number(inquiriesCount[0]?.count || 0),
      }
    });
  } catch (error: any) {
    console.error('DB Stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
