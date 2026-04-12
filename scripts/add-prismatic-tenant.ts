import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Wb8lMyAIZv1m@ep-little-rain-ai32bkeo-pooler.c-4.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

async function addPrismaticTenant() {
  const sql = neon(DATABASE_URL);

  console.log('===========================================');
  console.log('Add Prismatic Tenant - 2026-04-12');
  console.log('===========================================');

  // Check if Prismatic tenant already exists
  const existing = await sql`
    SELECT id, name, slug FROM public.tenants WHERE slug = 'prismatic'
  `;

  if (existing.length > 0) {
    console.log(`✓ Prismatic tenant already exists: ${existing[0].id}`);
  } else {
    // Insert Prismatic tenant
    const result = await sql`
      INSERT INTO public.tenants (name, slug, domain, timezone, language, settings)
      VALUES (
        'Prismatic 折射之光',
        'prismatic',
        'prismatic-app.vercel.app',
        'Asia/Shanghai',
        'zh-CN',
        '{"features": {"prismaticAnalytics": true, "personaTracking": true, "aiMetrics": true}}'
      )
      RETURNING id, name, slug
    `;
    console.log(`✓ Prismatic tenant created: ${result[0].id}`);
  }

  // Also check if the Prismatic tracking tables exist
  const tables = ['sessions', 'page_events', 'prismatic_events'];
  for (const table of tables) {
    try {
      const result = await sql`SELECT COUNT(*) as count FROM public.${sql(table)} LIMIT 1`;
      console.log(`✓ Table ${table} exists (${result[0].count} rows)`);
    } catch (e: any) {
      console.log(`✗ Table ${table} does not exist: ${e.message.substring(0, 80)}`);
    }
  }

  // Show all tenants
  const allTenants = await sql`
    SELECT id, name, slug FROM public.tenants ORDER BY created_at ASC
  `;
  console.log('\nAll tenants:');
  for (const t of allTenants) {
    console.log(`  - ${t.slug}: ${t.name} (${t.id})`);
  }

  console.log('\n===========================================');
  console.log('Done!');
  console.log('===========================================');
}

addPrismaticTenant().catch(console.error).finally(() => process.exit(0));
