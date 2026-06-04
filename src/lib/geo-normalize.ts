/**
 * 国家/城市名称标准化映射
 * 将不同格式的国家/城市名称统一为中文
 *
 * 注意：COUNTRY_MAPPING 和 CITY_MAPPING 已迁移到 lib/constants.ts
 * 此文件重新导出以保持向后兼容
 */

export { COUNTRY_MAPPING, CITY_MAPPING } from './constants'

import { COUNTRY_MAPPING, CITY_MAPPING } from './constants'

export function normalizeCountryName(name: string | null | undefined): string {
  if (!name) return '未知'
  const trimmed = name.trim().toLowerCase()
  return COUNTRY_MAPPING[trimmed] || name
}

export function normalizeCityName(name: string | null | undefined): string {
  if (!name) return '未知'
  const trimmed = name.trim().toLowerCase()
  return CITY_MAPPING[trimmed] || name
}

export function normalizeCountryData<T extends { name?: string | null }>(items: T[]): T[] {
  return items.map(item => ({
    ...item,
    name: item.name ? normalizeCountryName(item.name) : item.name,
  }))
}

export function normalizeCityData<T extends { name?: string | null }>(items: T[]): T[] {
  return items.map(item => ({
    ...item,
    name: item.name ? normalizeCityName(item.name) : item.name,
  }))
}
