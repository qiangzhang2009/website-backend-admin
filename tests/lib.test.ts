import { describe, it, expect } from 'vitest'
import { normalizeCountryName, normalizeCityName } from '../src/lib/geo-normalize'
import { COUNTRY_MAPPING, CITY_MAPPING, TIME, PAGINATION } from '../src/lib/constants'

describe('geo-normalize', () => {
  describe('normalizeCountryName', () => {
    it('should normalize US variations', () => {
      expect(normalizeCountryName('US')).toBe('美国')
      expect(normalizeCountryName('us')).toBe('美国')
      expect(normalizeCountryName('USA')).toBe('美国')
      expect(normalizeCountryName('united states')).toBe('美国')
    })

    it('should normalize China variations', () => {
      expect(normalizeCountryName('CN')).toBe('中国')
      expect(normalizeCountryName('china')).toBe('中国')
      expect(normalizeCountryName('CHN')).toBe('中国')
    })

    it('should normalize Japan variations', () => {
      expect(normalizeCountryName('JP')).toBe('日本')
      expect(normalizeCountryName('japan')).toBe('日本')
      expect(normalizeCountryName('JPN')).toBe('日本')
    })

    it('should return original for unknown countries', () => {
      expect(normalizeCountryName('UnknownLand')).toBe('UnknownLand')
    })

    it('should handle null and undefined', () => {
      expect(normalizeCountryName(null)).toBe('未知')
      expect(normalizeCountryName(undefined)).toBe('未知')
    })
  })

  describe('normalizeCityName', () => {
    it('should normalize city names', () => {
      expect(normalizeCityName('beijing')).toBe('北京')
      expect(normalizeCityName('new york')).toBe('纽约')
      expect(normalizeCityName('tokyo')).toBe('东京')
    })

    it('should return original for unknown cities', () => {
      expect(normalizeCityName('unknown city')).toBe('unknown city')
    })
  })
})

describe('constants', () => {
  it('should have valid COUNTRY_MAPPING entries', () => {
    expect(COUNTRY_MAPPING['us']).toBe('美国')
    expect(COUNTRY_MAPPING['cn']).toBe('中国')
    expect(COUNTRY_MAPPING['jp']).toBe('日本')
  })

  it('should have valid TIME constants', () => {
    expect(TIME.ONLINE_USER_TIMEOUT_MS).toBeGreaterThan(0)
    expect(TIME.DATE_RANGE_MAX_DAYS).toBe(90)
    expect(TIME.MAX_DATA_POINTS).toBe(30)
  })

  it('should have valid PAGINATION constants', () => {
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(20)
    expect(PAGINATION.MAX_PAGE_SIZE).toBe(200)
    expect(PAGINATION.DEFAULT_PAGE).toBe(1)
  })
})
