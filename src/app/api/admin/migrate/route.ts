import { NextRequest, NextResponse } from 'next/server'
import { sql, isDbConfigured } from '@/lib/db'

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders })
  }

  try {
    if (!isDbConfigured || !sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders })
    }

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
    `

    // 创建索引
    await sql`
      CREATE INDEX IF NOT EXISTS idx_tracking_events_visitor_id ON public.tracking_events(visitor_id);
      CREATE INDEX IF NOT EXISTS idx_tracking_events_session_id ON public.tracking_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_tracking_events_geo_country ON public.tracking_events(geo_country);
      CREATE INDEX IF NOT EXISTS idx_tracking_events_device_type ON public.tracking_events(device_type);
      CREATE INDEX IF NOT EXISTS idx_tracking_events_traffic_source ON public.tracking_events(traffic_source)
    `

    return NextResponse.json({ success: true, message: 'Migration completed' }, { headers: corsHeaders })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500, headers: corsHeaders })
  }
}
