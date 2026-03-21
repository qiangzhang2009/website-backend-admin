/**
 * 租户 slug 规范化：历史重复租户合并为统一 canonical slug。
 * import-website 与 global2china 为同一站点（global2china.zxqconsulting.com），统一使用 global2china。
 */
export const TENANT_SLUG_ALIASES: Record<string, string> = {
  'import-website': 'global2china',
}

/** 将请求中的 tenant slug 解析为数据库中的 canonical slug */
export function resolveTenantSlug(slug: string | null | undefined): string | null {
  if (!slug || typeof slug !== 'string') return null
  const trimmed = slug.trim()
  if (!trimmed) return null
  return TENANT_SLUG_ALIASES[trimmed] ?? trimmed
}
