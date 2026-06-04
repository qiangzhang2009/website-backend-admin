import { describe, it, expect } from 'vitest'
import {
  parseDateRange,
  parseCustomDateRange,
  generateDateArray,
  getComparisonRange,
  getDateRangeWhereClause,
} from '../src/lib/date-range'

describe('date-range utility', () => {
  describe('parseDateRange', () => {
    it('should parse today preset', () => {
      const result = parseDateRange('today')
      expect(result.label).toBe('今天')
      expect(result.days).toBe(1)
      expect(result.start).toBeTruthy()
      expect(result.end).toBeTruthy()
    })

    it('should parse yesterday preset', () => {
      const result = parseDateRange('yesterday')
      expect(result.label).toBe('昨天')
      expect(result.days).toBe(1)
    })

    it('should parse last7days preset', () => {
      const result = parseDateRange('last7days')
      expect(result.label).toBe('最近7天')
      expect(result.days).toBe(7)
    })

    it('should parse last30days preset', () => {
      const result = parseDateRange('last30days')
      expect(result.label).toBe('最近30天')
      expect(result.days).toBe(30)
    })

    it('should default to last7days when null', () => {
      const result = parseDateRange(null)
      expect(result.label).toBe('最近7天')
      expect(result.days).toBe(7)
    })

    it('should default to last7days when undefined', () => {
      const result = parseDateRange(undefined)
      expect(result.label).toBe('最近7天')
    })

    it('should default to last7days when empty string', () => {
      const result = parseDateRange('')
      expect(result.label).toBe('最近7天')
    })

    it('should return valid ISO date strings', () => {
      const result = parseDateRange('last7days')
      expect(result.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(result.end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(result.startLocal).toMatch(/^\d{4}-\d{2}-\d{2}/)
      expect(result.endLocal).toMatch(/^\d{4}-\d{2}-\d{2}/)
    })

    it('should parse last14days preset', () => {
      const result = parseDateRange('last14days')
      expect(result.days).toBe(14)
    })

    it('should parse last90days preset', () => {
      const result = parseDateRange('last90days')
      expect(result.days).toBe(90)
    })

    it('should parse thisMonth preset', () => {
      const result = parseDateRange('thisMonth')
      expect(result.label).toBe('本月')
    })
  })

  describe('parseCustomDateRange', () => {
    it('should parse valid custom range', () => {
      const result = parseCustomDateRange('2025-01-01,2025-01-07')
      expect(result).not.toBeNull()
      expect(result!.label).toBe('2025-01-01 至 2025-01-07')
      expect(result!.days).toBe(7)
    })

    it('should return null for invalid format', () => {
      expect(parseCustomDateRange('2025-01-01')).toBeNull()
      expect(parseCustomDateRange('2025-01-01,')).toBeNull()
      expect(parseCustomDateRange(',2025-01-07')).toBeNull()
    })

    it('should return null for invalid dates', () => {
      expect(parseCustomDateRange('not-a-date,2025-01-07')).toBeNull()
      expect(parseCustomDateRange('2025-01-01,not-a-date')).toBeNull()
    })

    it('should return null when start > end', () => {
      expect(parseCustomDateRange('2025-01-07,2025-01-01')).toBeNull()
    })
  })

  describe('generateDateArray', () => {
    it('should generate day array', () => {
      const start = new Date('2025-01-01T00:00:00Z')
      const end = new Date('2025-01-03T00:00:00Z')
      const dates = generateDateArray(start, end, 'day')
      expect(dates).toEqual(['2025-01-01', '2025-01-02', '2025-01-03'])
    })

    it('should generate week array', () => {
      const start = new Date('2025-01-01T00:00:00Z')
      const end = new Date('2025-01-21T00:00:00Z')
      const dates = generateDateArray(start, end, 'week')
      expect(dates.length).toBeGreaterThan(0)
      dates.forEach(d => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/))
    })

    it('should generate month array', () => {
      const start = new Date('2025-01-01T00:00:00Z')
      const end = new Date('2025-03-01T00:00:00Z')
      const dates = generateDateArray(start, end, 'month')
      expect(dates).toEqual(['2025-01', '2025-02', '2025-03'])
    })
  })

  describe('getComparisonRange', () => {
    it('should return previous period with same duration', () => {
      // Use explicit UTC dates to avoid timezone issues
      const range = {
        start: new Date('2025-01-08T00:00:00.000Z'),
        end: new Date('2025-01-14T23:59:59.999Z'),
        label: '最近7天',
        days: 7,
      }
      const comparison = getComparisonRange(range)
      // Jan 8 to Jan 14 = 6 full days; previous period starts Jan 2
      expect(comparison.days).toBe(7)
      expect(comparison.start.getTime()).toBeLessThan(range.start.getTime())
      expect(comparison.end.getTime()).toBeLessThan(range.start.getTime())
    })
  })

  describe('getDateRangeWhereClause', () => {
    it('should return safe SQL WHERE clauses', () => {
      const clause = getDateRangeWhereClause('created_at', 'last7days')
      expect(clause.start).toContain('created_at >=')
      expect(clause.end).toContain('created_at <=')
      // Should contain ISO timestamp in single quotes (SQL-safe)
      expect(clause.start).toContain("'2")
      expect(clause.end).toContain("'2")
    })
  })
})

describe('constants', () => {
  it('should have valid TIME constants', async () => {
    const { TIME } = await import('../src/lib/constants')
    expect(TIME.ONLINE_USER_TIMEOUT_MS).toBeGreaterThan(0)
    expect(TIME.DATE_RANGE_MAX_DAYS).toBe(90)
    expect(TIME.MAX_DATA_POINTS).toBe(30)
    expect(TIME.REALTIME_REFRESH_INTERVAL_MS).toBe(30000)
  })

  it('should have valid PAGINATION constants', async () => {
    const { PAGINATION } = await import('../src/lib/constants')
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(20)
    expect(PAGINATION.MAX_PAGE_SIZE).toBe(200)
    expect(PAGINATION.DEFAULT_PAGE).toBe(1)
  })

  it('should have COUNTRY_MAPPING entries', async () => {
    const { COUNTRY_MAPPING } = await import('../src/lib/constants')
    expect(COUNTRY_MAPPING['us']).toBe('美国')
    expect(COUNTRY_MAPPING['cn']).toBe('中国')
    expect(COUNTRY_MAPPING['jp']).toBe('日本')
    expect(COUNTRY_MAPPING['uk']).toBe('英国')
    expect(COUNTRY_MAPPING['de']).toBe('德国')
  })

  it('should have CITY_MAPPING entries', async () => {
    const { CITY_MAPPING } = await import('../src/lib/constants')
    expect(CITY_MAPPING['beijing']).toBe('北京')
    expect(CITY_MAPPING['new york']).toBe('纽约')
    expect(CITY_MAPPING['london']).toBe('伦敦')
    expect(CITY_MAPPING['tokyo']).toBe('东京')
  })

  it('should have all expected TRACKING_EVENT_TYPES', async () => {
    const { TRACKING_EVENT_TYPES } = await import('../src/lib/constants')
    expect(TRACKING_EVENT_TYPES.PAGE_VIEW).toBe('page_view')
    expect(TRACKING_EVENT_TYPES.TOOL_START).toBe('tool_start')
    expect(TRACKING_EVENT_TYPES.TOOL_COMPLETE).toBe('tool_complete')
    expect(TRACKING_EVENT_TYPES.HEARTBEAT).toBe('heartbeat')
  })
})

describe('geo-normalize', () => {
  it('should normalize country names', async () => {
    const { normalizeCountryName } = await import('../src/lib/geo-normalize')
    expect(normalizeCountryName('US')).toBe('美国')
    expect(normalizeCountryName('us')).toBe('美国')
    expect(normalizeCountryName('CN')).toBe('中国')
    expect(normalizeCountryName('japan')).toBe('日本')
    expect(normalizeCountryName('jp')).toBe('日本')
    expect(normalizeCountryName('unknown')).toBe('unknown')
  })

  it('should normalize city names', async () => {
    const { normalizeCityName } = await import('../src/lib/geo-normalize')
    expect(normalizeCityName('beijing')).toBe('北京')
    expect(normalizeCityName('new york')).toBe('纽约')
    expect(normalizeCityName('tokyo')).toBe('东京')
    expect(normalizeCityName('unknown city')).toBe('unknown city')
  })

  it('should handle null and undefined', async () => {
    const { normalizeCountryName, normalizeCityName } = await import('../src/lib/geo-normalize')
    expect(normalizeCountryName(null)).toBe('未知')
    expect(normalizeCountryName(undefined)).toBe('未知')
    expect(normalizeCityName(null)).toBe('未知')
    expect(normalizeCityName(undefined)).toBe('未知')
  })

  it('should normalize country data arrays', async () => {
    const { normalizeCountryData } = await import('../src/lib/geo-normalize')
    const input = [{ name: 'US' }, { name: 'CN' }, { name: null }]
    const result = normalizeCountryData(input)
    expect(result[0].name).toBe('美国')
    expect(result[1].name).toBe('中国')
    expect(result[2].name).toBeNull()
  })
})
