/**
 * 执行 Prismatic 追踪 v2 表结构迁移
 * 创建 sessions / page_events / prismatic_events / websites 表
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Wb8lMyAIZv1m@ep-little-rain-ai32bkeo-pooler.c-4.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

async function createPrismaticTables() {
  const sql = neon(DATABASE_URL);

  console.log('===========================================');
  console.log('Create Prismatic Tracking v2 Tables');
  console.log('===========================================\n');

  // ── 1. sessions 表 ──────────────────────────────────────────
  console.log('[1/4] Creating sessions table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS public.sessions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID,
        session_id      TEXT UNIQUE NOT NULL,
        visitor_id      TEXT NOT NULL,
        browser         TEXT,
        os              TEXT,
        device_type     TEXT DEFAULT 'desktop',
        country         TEXT,
        subdivision1    TEXT,
        city            TEXT,
        ip_address      TEXT,
        first_visit    TIMESTAMPTZ DEFAULT NOW(),
        last_visit     TIMESTAMPTZ DEFAULT NOW(),
        page_count     INTEGER DEFAULT 1,
        is_bounce      BOOLEAN DEFAULT FALSE,
        created_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('  ✓ sessions table created');
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('  ○ sessions table already exists');
    } else {
      console.log(`  ✗ sessions: ${e.message.substring(0, 120)}`);
    }
  }

  // ── 2. page_events 表 ────────────────────────────────────────
  console.log('[2/4] Creating page_events table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS public.page_events (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID,
        website_id      TEXT,
        session_id      TEXT NOT NULL,
        visitor_id      TEXT NOT NULL,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        event_type      TEXT NOT NULL DEFAULT 'pageview',
        url_path        TEXT,
        referrer_domain TEXT,
        url_query       TEXT,
        browser         TEXT,
        os              TEXT,
        device_type     TEXT DEFAULT 'desktop',
        country         TEXT,
        subdivision1    TEXT,
        city            TEXT,
        event_name      TEXT,
        event_data      JSONB DEFAULT '{}',
        page_load_time  INTEGER,
        ttfb            INTEGER,
        session_duration_ms INTEGER,
        is_first_visit    BOOLEAN DEFAULT FALSE,
        is_returning_visit BOOLEAN DEFAULT FALSE,
        first_visit_time  TIMESTAMPTZ,
        timezone        TEXT,
        traffic_source TEXT,
        hostname       TEXT
      )
    `;
    console.log('  ✓ page_events table created');
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('  ○ page_events table already exists');
    } else {
      console.log(`  ✗ page_events: ${e.message.substring(0, 120)}`);
    }
  }

  // ── 3. prismatic_events 表 ───────────────────────────────────
  console.log('[3/4] Creating prismatic_events table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS public.prismatic_events (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID,
        session_id      TEXT,
        visitor_id      TEXT,
        persona_id      TEXT,
        persona_name    TEXT,
        domain          TEXT,
        event_type      TEXT NOT NULL,
        event_data      JSONB DEFAULT '{}',
        ai_latency_ms   INTEGER,
        model_used      TEXT,
        confidence_score REAL,
        conversation_turn INTEGER DEFAULT 0,
        mode            TEXT,
        chat_start_time TIMESTAMPTZ,
        last_message_at TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('  ✓ prismatic_events table created');
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('  ○ prismatic_events table already exists');
    } else {
      console.log(`  ✗ prismatic_events: ${e.message.substring(0, 120)}`);
    }
  }

  // ── 4. websites 表 ──────────────────────────────────────────
  console.log('[4/4] Creating websites table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS public.websites (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID,
        website_id  TEXT UNIQUE NOT NULL,
        name        TEXT NOT NULL,
        domain      TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    // Insert Prismatic website
    await sql`INSERT INTO public.websites (website_id, name, domain) VALUES ('prismatic', 'Prismatic 蒸馏人物', 'prismatic-app.vercel.app') ON CONFLICT (website_id) DO NOTHING`;
    console.log('  ✓ websites table created');
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('  ○ websites table already exists');
    } else {
      console.log(`  ✗ websites: ${e.message.substring(0, 120)}`);
    }
  }

  // ── 创建索引 ────────────────────────────────────────────────
  console.log('\n[Index] Creating indexes...');
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_sessions_tenant_session ON public.sessions(tenant_id, session_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_tenant_visitor ON public.sessions(tenant_id, visitor_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_last_visit ON public.sessions(last_visit DESC)',
    'CREATE INDEX IF NOT EXISTS idx_page_events_tenant_session ON public.page_events(tenant_id, session_id)',
    'CREATE INDEX IF NOT EXISTS idx_page_events_created ON public.page_events(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_page_events_tenant_path ON public.page_events(tenant_id, url_path)',
    'CREATE INDEX IF NOT EXISTS idx_page_events_tenant_type ON public.page_events(tenant_id, event_type)',
    'CREATE INDEX IF NOT EXISTS idx_prismatic_tenant ON public.prismatic_events(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_prismatic_persona ON public.prismatic_events(persona_id)',
    'CREATE INDEX IF NOT EXISTS idx_prismatic_type ON public.prismatic_events(event_type)',
    'CREATE INDEX IF NOT EXISTS idx_prismatic_created ON public.prismatic_events(created_at DESC)',
  ];

  for (const idx of indexes) {
    try {
      await sql.query(idx);
      const name = idx.match(/IF NOT EXISTS (\w+)/)?.[1] || 'idx';
      console.log(`  ✓ ${name}`);
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        const name = idx.match(/IF NOT EXISTS (\w+)/)?.[1] || 'idx';
        console.log(`  ○ ${name} (already exists)`);
      } else {
        console.log(`  ✗ ${idx.substring(0, 60)}: ${e.message.substring(0, 60)}`);
      }
    }
  }

  // ── 验证结果 ────────────────────────────────────────────────
  console.log('\n[Verify] Checking tables...');
  const tables = ['sessions', 'page_events', 'prismatic_events', 'websites'];
  for (const t of tables) {
    try {
      const result = await sql`SELECT COUNT(*) as c FROM public.${sql(t)} LIMIT 1`;
      console.log(`  ✓ ${t}: ${result[0].c} rows`);
    } catch (e: any) {
      console.log(`  ✗ ${t}: ${e.message.substring(0, 80)}`);
    }
  }

  // ── Prismatic Tenant ─────────────────────────────────────────
  console.log('\n[Tenant] Prismatic tenant...');
  const prismaticTenant = await sql`SELECT id, name, slug FROM public.tenants WHERE slug = 'prismatic'`;
  if (prismaticTenant.length > 0) {
    console.log(`  ✓ ${prismaticTenant[0].name} (${prismaticTenant[0].id})`);
  } else {
    console.log('  ✗ Prismatic tenant not found — run add-prismatic-tenant.ts first');
  }

  console.log('\n===========================================');
  console.log('Done! Prismatic tracking tables ready.');
  console.log('===========================================');
  console.log('\n📍 Next: Visit your backend admin → Prismatic Analytics');
  console.log('   https://your-backend-domain/admin/prismatic?tenant=prismatic');
}

createPrismaticTables().catch(console.error).finally(() => process.exit(0));
