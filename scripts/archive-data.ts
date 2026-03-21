/**
 * 数据归档脚本
 * 将超过一定时间的冷数据迁移到归档表或对象存储
 * 
 * 使用方式:
 * npx tsx scripts/archive-data.ts [--days=365] [--dry-run]
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Wb8lMyAIZv1m@ep-little-rain-ai32bkeo-pooler.c-4.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const sql = neon(DATABASE_URL);

// 归档配置
const ARCHIVE_CONFIG = {
  // 超过此天数的数据将被归档
  daysToArchive: 365,
  // 每次归档的批次大小
  batchSize: 1000,
};

interface ArchiveResult {
  table: string;
  archived: number;
  deleted: number;
  duration: number;
}

async function getTableStats(): Promise<void> {
  console.log('\n📊 当前数据库表统计:\n');
  
  const tables = ['tracking_events', 'tool_interactions', 'page_views', 'chat_histories', 'module_usage'];
  
  for (const table of tables) {
    try {
      const result = await sql`
        SELECT 
          COUNT(*) as total_count,
          MIN(created_at) as oldest_date,
          MAX(created_at) as newest_date,
          pg_size_pretty(pg_total_relation_size('${sql(table as any)}')) as table_size
        FROM ${sql(table as any)}
      `;
      
      if (result[0]) {
        console.log(`  ${table}:`);
        console.log(`    - 记录数: ${result[0].total_count}`);
        console.log(`    - 表大小: ${result[0].table_size}`);
        console.log(`    - 最早数据: ${result[0].oldest_date || 'N/A'}`);
        console.log(`    - 最新数据: ${result[0].newest_date || 'N/A'}`);
      }
    } catch (e: any) {
      console.log(`  ${table}: 表不存在或无数据`);
    }
  }
}

async function archiveTable(
  tableName: string, 
  archiveDate: Date,
  dryRun: boolean = false
): Promise<ArchiveResult> {
  const startTime = Date.now();
  let archived = 0;
  let deleted = 0;
  
  console.log(`\n📦 处理表: ${tableName}`);
  console.log(`   归档日期: ${archiveDate.toISOString()}`);
  console.log(`   模式: ${dryRun ? 'DRY RUN (仅统计)' : '实际执行'}`);
  
  try {
    // 统计待归档数据
    const countResult = await sql`
      SELECT COUNT(*) as count 
      FROM ${sql(tableName as any)}
      WHERE created_at < ${archiveDate}
    `;
    
    const toArchive = Number(countResult[0]?.count || 0);
    console.log(`   待归档记录: ${toArchive}`);
    
    if (toArchive === 0) {
      console.log(`   ✅ 无需归档`);
      return { table: tableName, archived: 0, deleted: 0, duration: Date.now() - startTime };
    }
    
    if (dryRun) {
      console.log(`   🔍 DRY RUN: 跳过实际归档`);
      return { table: tableName, archived: toArchive, deleted: 0, duration: Date.now() - startTime };
    }
    
    // 创建归档表（如果不存在）
    const archiveTableName = `${tableName}_archive`;
    await sql`
      CREATE TABLE IF NOT EXISTS ${sql(archiveTableName as any)} (
        LIKE ${sql(tableName as any)} INCLUDING ALL
      )
    `;
    
    // 批量归档数据
    let batchArchived = 0;
    while (true) {
      const batchResult = await sql`
        INSERT INTO ${sql(archiveTableName as any)}
        SELECT * FROM ${sql(tableName as any)}
        WHERE created_at < ${archiveDate}
        ORDER BY created_at
        LIMIT ${ARCHIVE_CONFIG.batchSize}
        RETURNING id
      `;
      
      if (batchResult.length === 0) break;
      
      batchArchived += batchResult.length;
      
      // 删除已归档的原始数据
      const oldestInBatch = await sql`
        SELECT MIN(created_at) as oldest 
        FROM ${sql(tableName as any)}
        WHERE id = ANY(${batchResult.map((r: any) => r.id)})
      `;
      
      if (oldestInBatch[0]?.oldest) {
        await sql`
          DELETE FROM ${sql(tableName as any)}
          WHERE created_at < ${oldestInBatch[0].oldest}
        `;
      }
      
      console.log(`   📤 已归档: ${batchArchived}/${toArchive}`);
      
      if (batchArchived >= toArchive) break;
    }
    
    archived = batchArchived;
    deleted = batchArchived;
    
    console.log(`   ✅ 归档完成: ${archived} 条记录`);
    
  } catch (e: any) {
    console.log(`   ❌ 错误: ${e.message}`);
  }
  
  return { table: tableName, archived, deleted, duration: Date.now() - startTime };
}

async function createArchivePolicy(): Promise<void> {
  console.log('\n📋 创建自动归档策略...\n');
  
  // 创建归档策略函数
  await sql`
    CREATE OR REPLACE FUNCTION auto_archive_old_data()
    RETURNS void
    LANGUAGE plpgsql
    AS $$
    DECLARE
      archive_date TIMESTAMP := NOW() - INTERVAL '1 year';
      archived_count INTEGER := 0;
    BEGIN
      -- 归档 tracking_events
      INSERT INTO tracking_events_archive
      SELECT * FROM tracking_events
      WHERE created_at < archive_date
      AND event_type = 'page_view'
      LIMIT 10000;
      
      GET DIAGNOSTICS archived_count = ROW_COUNT;
      IF archived_count > 0 THEN
        DELETE FROM tracking_events
        WHERE id IN (
          SELECT id FROM tracking_events
          WHERE created_at < archive_date
          AND event_type = 'page_view'
          LIMIT 10000
        );
        RAISE NOTICE 'Archived % tracking_events records', archived_count;
      END IF;
    END;
    $$
  `;
  
  console.log('  ✅ auto_archive_old_data() 函数已创建');
  
  // 创建定时任务（可选，取决于数据库支持）
  console.log('  ℹ️  可使用 cron 或外部调度器定期执行: SELECT auto_archive_old_data()');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  let days = ARCHIVE_CONFIG.daysToArchive;
  const daysArg = args.find(a => a.startsWith('--days='));
  if (daysArg) {
    days = parseInt(daysArg.split('=')[1], 10);
  }
  
  const archiveDate = new Date();
  archiveDate.setDate(archiveDate.getDate() - days);
  
  console.log('===========================================');
  console.log('       数据归档脚本');
  console.log('===========================================');
  console.log(`归档阈值: ${days} 天前`);
  console.log(`归档日期: ${archiveDate.toISOString()}`);
  console.log(`执行模式: ${dryRun ? 'DRY RUN' : '实际执行'}`);
  console.log('===========================================');
  
  // 显示当前统计
  await getTableStats();
  
  // 需要归档的表
  const tablesToArchive = ['tracking_events', 'tool_interactions', 'page_views', 'chat_histories'];
  
  // 执行归档
  console.log('\n🚀 开始归档...\n');
  
  const results: ArchiveResult[] = [];
  for (const table of tablesToArchive) {
    const result = await archiveTable(table, archiveDate, dryRun);
    results.push(result);
  }
  
  // 汇总结果
  console.log('\n===========================================');
  console.log('       归档结果汇总');
  console.log('===========================================');
  
  let totalArchived = 0;
  let totalDeleted = 0;
  
  for (const result of results) {
    console.log(`\n${result.table}:`);
    console.log(`  归档: ${result.archived} 条`);
    console.log(`  删除: ${result.deleted} 条`);
    console.log(`  耗时: ${result.duration}ms`);
    
    totalArchived += result.archived;
    totalDeleted += result.deleted;
  }
  
  console.log(`\n总计:`);
  console.log(`  归档: ${totalArchived} 条`);
  console.log(`  删除: ${totalDeleted} 条`);
  console.log('===========================================');
  
  // 创建归档策略（仅在实际执行时）
  if (!dryRun && totalArchived > 0) {
    await createArchivePolicy();
  }
}

main().catch(console.error).finally(() => process.exit(0));
