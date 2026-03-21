import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Wb8lMyAIZv1m@ep-little-rain-ai32bkeo-pooler.c-4.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

async function runMigration() {
  const sql = neon(DATABASE_URL);
  
  console.log('===========================================');
  console.log('Database Migration - 2026-03-14');
  console.log('===========================================');
  
  console.log('\n[1/4] Adding new columns to tracking_events...');
  
  try {
    await sql`
      ALTER TABLE public.tracking_events 
      ADD COLUMN IF NOT EXISTS device_type TEXT,
      ADD COLUMN IF NOT EXISTS browser TEXT,
      ADD COLUMN IF NOT EXISTS os TEXT,
      ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
      ADD COLUMN IF NOT EXISTS language TEXT,
      ADD COLUMN IF NOT EXISTS traffic_source TEXT,
      ADD COLUMN IF NOT EXISTS geo_country TEXT,
      ADD COLUMN IF NOT EXISTS geo_region TEXT,
      ADD COLUMN IF NOT EXISTS geo_city TEXT,
      ADD COLUMN IF NOT EXISTS geo_isp TEXT
    `;
    console.log('  Columns added!');
  } catch (e: any) {
    if (e.message?.includes('duplicate')) {
      console.log('  Columns already exist, skipping...');
    } else {
      throw e;
    }
  }
  
  console.log('\n[2/4] Creating basic indexes...');
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_tracking_events_visitor_id ON public.tracking_events(visitor_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tracking_events_session_id ON public.tracking_events(session_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tracking_events_geo_country ON public.tracking_events(geo_country)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tracking_events_device_type ON public.tracking_events(device_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tracking_events_traffic_source ON public.tracking_events(traffic_source)`;
    console.log('  Basic indexes created!');
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('  Basic indexes already exist, skipping...');
    } else {
      throw e;
    }
  }
  
  console.log('\n[3/4] Creating performance optimization indexes (from evaluation report)...');
  
  // 评估报告建议的复合索引 - 使用直接 SQL 执行
  const performanceIndexes = [
    // tracking_events 表复合索引
    `CREATE INDEX IF NOT EXISTS idx_tracking_events_tenant_session ON public.tracking_events(tenant_id, session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tracking_events_tenant_type_time ON public.tracking_events(tenant_id, event_type, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_tracking_events_tenant_visitor ON public.tracking_events(tenant_id, visitor_id)`,
    
    // tool_interactions 表复合索引
    `CREATE INDEX IF NOT EXISTS idx_tool_interactions_tenant_created ON public.tool_interactions(tenant_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_tool_interactions_tenant_tool_time ON public.tool_interactions(tenant_id, tool_name, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_tool_interactions_tenant_session ON public.tool_interactions(tenant_id, session_id)`,
    
    // 其他表优化索引
    `CREATE INDEX IF NOT EXISTS idx_page_views_tenant_session_time ON public.page_views(tenant_id, session_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_visits_tenant_time ON public.visits(tenant_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_inquiries_tenant_status_time ON public.inquiries(tenant_id, status, created_at DESC)`,
  ];
  
  for (const idxSql of performanceIndexes) {
    try {
      // 使用 await sql.query() 方式执行动态 SQL
      await sql.query(idxSql);
      const idxName = idxSql.match(/IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
      console.log(`  ✓ ${idxName}`);
    } catch (e: any) {
      const idxName = idxSql.match(/IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
      if (e.message?.includes('already exists') || e.message?.includes('duplicate')) {
        console.log(`  ○ ${idxName} (already exists)`);
      } else {
        console.log(`  ✗ ${idxName}: ${e.message.substring(0, 80)}`);
      }
    }
  }
  
  console.log('\n[4/4] Verifying indexes...');
  const indexes = await sql`
    SELECT indexname, tablename 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname
  `;
  
  console.log(`  Total indexes: ${indexes.length}`);
  for (const idx of indexes) {
    console.log(`    - ${idx.tablename}.${idx.indexname}`);
  }
  
  console.log('\n===========================================');
  console.log('Migration completed successfully!');
  console.log('===========================================');
}

runMigration().catch(console.error).finally(() => process.exit(0));
