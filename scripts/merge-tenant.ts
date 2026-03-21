/**
 * 执行租户合并迁移：import-website → global2china
 * 将 import-website 租户的数据归并到 global2china，并删除重复行
 */
import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL || ''

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function main() {
  console.log('=== 租户合并迁移 ===')

  // 1. 确认两个租户都存在
  const tenants = await sql`SELECT id, slug, name, domain FROM public.tenants ORDER BY created_at ASC`
  console.log('\n当前租户列表:')
  tenants.forEach((t: any) => console.log(`  - ${t.slug}  (${t.name})  id=${t.id.slice(0, 8)}...`))

  const global2china = tenants.find((t: any) => t.slug === 'global2china')
  const importWebsite = tenants.find((t: any) => t.slug === 'import-website')

  if (!global2china && !importWebsite) {
    console.log('\n两个租户都不存在，无需合并。')
    return
  }

  if (!importWebsite) {
    console.log('\n仅存在 global2china，无需合并。')
    return
  }

  if (!global2china) {
    // 只有 import-website → 直接改 slug
    console.log('\n仅有 import-website，重命名为 global2china...')
    await sql`UPDATE public.tenants SET slug = 'global2china', name = 'Global2China 全球优品', domain = 'global2china.zxqconsulting.com' WHERE slug = 'import-website'`
    console.log('完成。')
    return
  }

  // 两个都存在 → 执行完整合并
  console.log(`\n发现两个租户：`)
  console.log(`  keep: global2china id=${global2china.id.slice(0, 8)}`)
  console.log(`  drop: import-website id=${importWebsite.id.slice(0, 8)}`)

  const keepId = global2china.id
  const dropId = importWebsite.id

  console.log('\n合并数据...')

  // 统计各表行数
  const tableCount = async (table: string, cond: string) => {
    try {
      const result = await sql`SELECT COUNT(*) as c FROM public.${sql(table as any)} WHERE ${sql.unsafe(cond)}`
      return Number(result[0]?.c ?? 0)
    } catch { return 0 }
  }

  const tables = ['tracking_events','visits','page_views','tool_interactions',
    'inquiries','follow_ups','tags','users',
    'user_preferences','user_profiles','module_usage',
    'user_lifecycle','rfm_analysis','conversation_sessions',
    'content_analytics','funnel_analytics','chat_histories']

  for (const t of tables) {
    const before = await tableCount(t, `tenant_id = '${dropId}'`)
    const keepBefore = await tableCount(t, `tenant_id = '${keepId}'`)
    if (before === 0) continue
    try {
      await sql`UPDATE public.${sql(t as any)} SET tenant_id = ${keepId} WHERE tenant_id = ${dropId}`
      const after = await tableCount(t, `tenant_id = '${dropId}'`)
      const keepAfter = await tableCount(t, `tenant_id = '${keepId}'`)
      console.log(`  ${t}: ${before} 行 → keep侧（${keepBefore}+${before-0}=${keepAfter}）; drop侧剩余 ${after}`)
    } catch (e: any) {
      if (e.message?.includes('does not exist') || e.message?.includes('undefined_table')) {
        console.log(`  ${t}: 表不存在，跳过`)
      } else {
        console.log(`  ${t}: 跳过 (${e.message?.slice(0, 60)})`)
      }
    }
  }

  // 删除重复租户行
  await sql`DELETE FROM public.tenants WHERE id = ${dropId}`
  console.log('\n删除了 import-website 租户行')

  // 更新 global2china 的元数据
  await sql`UPDATE public.tenants SET name = 'Global2China 全球优品', domain = 'global2china.zxqconsulting.com' WHERE id = ${keepId}`
  console.log('更新了 global2china 元数据')

  // 验证
  const final = await sql`SELECT slug, name, domain FROM public.tenants ORDER BY created_at ASC`
  console.log('\n合并后租户列表:')
  final.forEach((t: any) => console.log(`  - ${t.slug}  (${t.name})`))

  console.log('\n✅ 合并完成！')
}

main().catch((e) => {
  console.error('迁移失败:', e)
  process.exit(1)
})
