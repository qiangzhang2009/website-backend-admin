/**
 * 数据库归档脚本
 *
 * 用途：将超过 180 天的 tracking_events 数据归档到归档表
 * 减少主表大小，提升查询性能
 *
 * 使用方式:
 *   npx ts-node scripts/archive-tracking-events.ts
 *   npx ts-node scripts/archive-tracking-events.ts --dry-run
 *   npx ts-node scripts/archive-tracking-events.ts --days=90
 *
 * 注意：
 *   - 首次运行需要创建归档表，运行前请备份数据
 *   - 建议在低峰期执行
 *   - Neon 免费版限制并发连接数，归档操作不要过于频繁
 */

import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required')
  process.exit(1)
}

const DAYS = parseInt(process.argv.find(arg => arg.startsWith('--days='))?.split('=')[1] ?? '180', 10)
const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 5000

const sql = neon(DATABASE_URL)

async function main() {
  console.log(`\n📦 Tracking Events Archive Script`)
  console.log(`   Retention period: ${DAYS} days`)
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}\n`)

  try {
    // Step 1: Create archive table if not exists
    console.log('🔧 Creating archive table if not exists...')
    await sql`
      CREATE TABLE IF NOT EXISTS public.tracking_events_archive (
        LIKE public.tracking_events INCLUDING ALL
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_archive_tenant_created ON public.tracking_events_archive(tenant_id, created_at)`

    // Step 2: Count records to archive
    const cutoffDate = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString()
    console.log(`   Cutoff date: ${cutoffDate}`)

    const countResult = await sql`SELECT COUNT(*)::int as count FROM public.tracking_events WHERE created_at < ${cutoffDate}`
    const totalToArchive = Number(countResult[0]?.count ?? 0)
    console.log(`   Records to archive: ${totalToArchive.toLocaleString()}`)

    if (totalToArchive === 0) {
      console.log('\n✅ No records to archive. All done!')
      return
    }

    if (DRY_RUN) {
      console.log('\n🔍 Dry run - showing first 10 records that would be archived:')
      const sample = await sql`SELECT id, tenant_id, event_type, created_at FROM public.tracking_events WHERE created_at < ${cutoffDate} LIMIT 10`
      sample.forEach((r: Record<string, unknown>) => {
        console.log(`   ID: ${r.id} | ${r.event_type} | ${r.created_at}`)
      })
      return
    }

    // Step 3: Archive in batches
    let archived = 0
    let deleted = 0
    let offset = 0

    console.log(`\n📤 Archiving in batches of ${BATCH_SIZE}...`)

    while (true) {
      // Copy batch to archive
      await sql`
        INSERT INTO public.tracking_events_archive
        SELECT * FROM public.tracking_events
        WHERE created_at < ${cutoffDate}
        ORDER BY created_at
        LIMIT ${BATCH_SIZE}
        OFFSET ${offset}
      `

      const affected = await sql`SELECT COUNT(*)::int as count FROM public.tracking_events WHERE created_at < ${cutoffDate}`
      const remaining = Number(affected[0]?.count ?? 0)

      archived += BATCH_SIZE
      offset += BATCH_SIZE

      console.log(`   Progress: ${archived.toLocaleString()} archived, ${remaining.toLocaleString()} remaining`)

      if (remaining === 0) break

      // Small delay to avoid overwhelming Neon
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Step 4: Delete archived records from main table
    console.log(`\n🗑️  Deleting archived records from main table...`)
    await sql`DELETE FROM public.tracking_events WHERE created_at < ${cutoffDate}`
    deleted = totalToArchive

    // Step 5: Final stats
    const mainTableCount = await sql`SELECT COUNT(*)::int as count FROM public.tracking_events`
    const archiveTableCount = await sql`SELECT COUNT(*)::int as count FROM public.tracking_events_archive`

    console.log(`\n✅ Archive completed!`)
    console.log(`   Archived: ${deleted.toLocaleString()} records`)
    console.log(`   Main table: ${Number(mainTableCount[0]?.count ?? 0).toLocaleString()} records`)
    console.log(`   Archive table: ${Number(archiveTableCount[0]?.count ?? 0).toLocaleString()} records`)

    // Step 6: Optional - Analyze tables to update statistics
    console.log(`\n📊 Running ANALYZE on tables...`)
    await sql`ANALYZE public.tracking_events`
    await sql`ANALYZE public.tracking_events_archive`
    console.log(`   Done.`)

  } catch (error) {
    console.error('\n❌ Archive failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main().catch(console.error)
