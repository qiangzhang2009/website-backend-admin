const { neon } = require('@neondatabase/serverless');

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('Adding new columns to tracking_events...');
  
  // 添加新字段
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
  
  console.log('Creating indexes...');
  
  // 创建索引
  await sql`CREATE INDEX IF NOT EXISTS idx_tracking_events_visitor_id ON public.tracking_events(visitor_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tracking_events_session_id ON public.tracking_events(session_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tracking_events_geo_country ON public.tracking_events(geo_country)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tracking_events_device_type ON public.tracking_events(device_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tracking_events_traffic_source ON public.tracking_events(traffic_source)`;
  
  console.log('Migration completed!');
}

runMigration().catch(console.error);
