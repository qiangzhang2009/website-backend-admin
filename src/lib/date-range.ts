/**
 * 日期范围工具函数
 * 统一处理 dateRange 参数的解析和边界
 */

import { TIME } from './constants'

export type DateRangePreset = 'today' | 'yesterday' | 'last7days' | 'last14days' | 'last30days' | 'last90days' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom'

export interface DateRange {
  start: Date
  end: Date
  label: string
  days: number
}

export interface ParsedDateRange {
  start: string   // ISO string for DB queries
  end: string     // ISO string for DB queries
  startLocal: string // Local date string "YYYY-MM-DD"
  endLocal: string   // Local date string "YYYY-MM-DD"
  label: string
  days: number
}

/**
 * 解析 dateRange 参数
 * 支持 preset 值或自定义 YYYY-MM-DD,YYYY-MM-DD 格式
 */
export function parseDateRange(
  dateRange: string | null | undefined,
  options?: {
    timezoneOffsetMinutes?: number  // e.g. +8h = 480 minutes
    defaultPreset?: DateRangePreset
  }
): ParsedDateRange {
  const offset = options?.timezoneOffsetMinutes ?? 8 * 60 // 默认 UTC+8
  const defaultPreset = options?.defaultPreset ?? 'last7days'

  const preset = (dateRange as DateRangePreset) || defaultPreset
  const range = buildRange(preset, offset)

  return {
    start: range.start.toISOString(),
    end: range.end.toISOString(),
    startLocal: range.start.toISOString().split('T')[0],
    endLocal: range.end.toISOString().split('T')[0],
    label: range.label,
    days: range.days,
  }
}

/**
 * 获取日期范围的 SQL WHERE 子句片段（防注入）
 */
export function getDateRangeWhereClause(
  column: string,
  dateRange: string | null | undefined,
  options?: { timezoneOffsetMinutes?: number }
): { start: string; end: string } {
  const parsed = parseDateRange(dateRange, options)
  return {
    start: `${column} >= '${parsed.start}'`,
    end: `${column} <= '${parsed.end}'`,
  }
}

function buildRange(preset: DateRangePreset, offsetMinutes: number): DateRange {
  const now = new Date()
  // 转换为本地时间
  const localNow = new Date(now.getTime() - offsetMinutes * 60000)
  const todayLocal = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate())
  const todayEndLocal = new Date(todayLocal.getTime() + 24 * 60 * 60 * 1000 - 1)

  switch (preset) {
    case 'today':
      return { start: todayLocal, end: todayEndLocal, label: '今天', days: 1 }

    case 'yesterday': {
      const yesterday = new Date(todayLocal.getTime() - 24 * 60 * 60 * 1000)
      return { start: yesterday, end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1), label: '昨天', days: 1 }
    }

    case 'last7days': {
      const start = new Date(todayLocal.getTime() - 6 * 24 * 60 * 60 * 1000)
      return { start, end: todayEndLocal, label: '最近7天', days: 7 }
    }

    case 'last14days': {
      const start = new Date(todayLocal.getTime() - 13 * 24 * 60 * 60 * 1000)
      return { start, end: todayEndLocal, label: '最近14天', days: 14 }
    }

    case 'last30days': {
      const start = new Date(todayLocal.getTime() - 29 * 24 * 60 * 60 * 1000)
      return { start, end: todayEndLocal, label: '最近30天', days: 30 }
    }

    case 'last90days': {
      const start = new Date(todayLocal.getTime() - 89 * 24 * 60 * 60 * 1000)
      return { start, end: todayEndLocal, label: '最近90天', days: 90 }
    }

    case 'thisWeek': {
      const dayOfWeek = todayLocal.getDay() || 7 // 周一=1, 周日=7
      const monday = new Date(todayLocal.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000)
      return { start: monday, end: todayEndLocal, label: '本周', days: dayOfWeek }
    }

    case 'thisMonth': {
      const start = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), 1)
      const daysInMonth = new Date(todayLocal.getFullYear(), todayLocal.getMonth() + 1, 0).getDate()
      return { start, end: todayEndLocal, label: '本月', days: todayLocal.getDate() }
    }

    case 'lastMonth': {
      const start = new Date(todayLocal.getFullYear(), todayLocal.getMonth() - 1, 1)
      const end = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), 0, 23, 59, 59)
      return { start, end, label: '上月', days: end.getDate() }
    }

    case 'custom':
    default:
      return { start: todayLocal, end: todayEndLocal, label: '最近7天', days: 7 }
  }
}

/**
 * 解析自定义日期范围字符串
 * 格式: "YYYY-MM-DD,YYYY-MM-DD"
 */
export function parseCustomDateRange(rangeStr: string): DateRange | null {
  const parts = rangeStr.split(',')
  if (parts.length !== 2) return null

  const start = new Date(parts[0].trim())
  const end = new Date(parts[1].trim())

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
  if (start > end) return null

  const diffMs = end.getTime() - start.getTime()
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000)) + 1

  return {
    start,
    end: new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1),
    label: `${parts[0].trim()} 至 ${parts[1].trim()}`,
    days,
  }
}

/**
 * 生成日期数组（用于图表 X 轴）
 */
export function generateDateArray(start: Date, end: Date, format: 'day' | 'week' | 'month' = 'day'): string[] {
  const dates: string[] = []
  const current = new Date(start)

  while (current <= end) {
    if (format === 'month') {
      dates.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`)
      current.setMonth(current.getMonth() + 1)
    } else if (format === 'week') {
      const weekStart = new Date(current)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      dates.push(weekStart.toISOString().split('T')[0])
      current.setDate(current.getDate() + 7)
    } else {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }
  }

  return dates
}

/**
 * 获取对比时间段（上周期）
 */
export function getComparisonRange(range: DateRange): DateRange {
  const diff = range.end.getTime() - range.start.getTime()
  return {
    start: new Date(range.start.getTime() - diff),
    end: new Date(range.start.getTime() - 1),
    label: `上周期（${range.days}天）`,
    days: range.days,
  }
}
