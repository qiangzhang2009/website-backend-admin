'use client'

import { useEffect, useState, useCallback } from 'react'

interface AnomalyConfig {
  metric: string
  threshold: number
  type: 'increase' | 'decrease' | 'range'
  minValue?: number
  maxValue?: number
}

interface AnomalyAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  message: string
  metric: string
  value: number
  threshold: number
  timestamp: Date
}

interface MetricData {
  current: number
  previous: number
  baseline?: number
}

// Default anomaly detection configurations
const DEFAULT_CONFIGS: AnomalyConfig[] = [
  { metric: 'visitors', threshold: 30, type: 'decrease' },
  { metric: 'conversionRate', threshold: 50, type: 'decrease' },
  { metric: 'bounceRate', threshold: 70, type: 'increase' },
  { metric: 'pageViews', threshold: 30, type: 'decrease' },
  { metric: 'inquiries', threshold: 40, type: 'decrease' },
]

// Check if there's an anomaly
function checkAnomaly(
  metric: string,
  current: number,
  previous: number,
  config: AnomalyConfig
): AnomalyAlert | null {
  if (previous === 0) return null

  const changePercent = ((current - previous) / previous) * 100

  switch (config.type) {
    case 'decrease':
      if (changePercent <= -config.threshold) {
        return {
          id: `${metric}-${Date.now()}`,
          type: Math.abs(changePercent) > 50 ? 'error' : 'warning',
          message: `${metric}较上期下降${Math.abs(changePercent).toFixed(1)}%，降幅超过${config.threshold}%`,
          metric,
          value: current,
          threshold: config.threshold,
          timestamp: new Date(),
        }
      }
      break

    case 'increase':
      if (changePercent >= config.threshold) {
        return {
          id: `${metric}-${Date.now()}`,
          type: changePercent > 100 ? 'error' : 'warning',
          message: `${metric}较上期增长${changePercent.toFixed(1)}%，增幅超过${config.threshold}%`,
          metric,
          value: current,
          threshold: config.threshold,
          timestamp: new Date(),
        }
      }
      break

    case 'range':
      if (config.minValue && current < config.minValue) {
        return {
          id: `${metric}-${Date.now()}`,
          type: 'warning',
          message: `${metric}低于最低阈值${config.minValue}`,
          metric,
          value: current,
          threshold: config.minValue,
          timestamp: new Date(),
        }
      }
      if (config.maxValue && current > config.maxValue) {
        return {
          id: `${metric}-${Date.now()}`,
          type: 'warning',
          message: `${metric}超过最高阈值${config.maxValue}`,
          metric,
          value: current,
          threshold: config.maxValue,
          timestamp: new Date(),
        }
      }
      break
  }

  return null
}

export function useAnomalyDetection(
  metrics: {
    visitors?: number
    pageViews?: number
    conversionRate?: number
    bounceRate?: number
    inquiries?: number
    leads?: number
    yesterdayVisitors?: number
    yesterdayPageViews?: number
    yesterdayConversionRate?: number
    yesterdayBounceRate?: number
    yesterdayInquiries?: number
    yesterdayLeads?: number
  },
  configs: AnomalyConfig[] = DEFAULT_CONFIGS,
  autoCheck: boolean = true
) {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([])
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [isEnabled, setIsEnabled] = useState(autoCheck)

  // Check for anomalies
  const checkAnomalies = useCallback(() => {
    const newAlerts: AnomalyAlert[] = []

    // Check visitors
    if (metrics.visitors !== undefined && metrics.yesterdayVisitors !== undefined) {
      const alert = checkAnomaly(
        '访客数',
        metrics.visitors,
        metrics.yesterdayVisitors,
        configs.find(c => c.metric === 'visitors') || DEFAULT_CONFIGS[0]
      )
      if (alert) newAlerts.push(alert)
    }

    // Check page views
    if (metrics.pageViews !== undefined && metrics.yesterdayPageViews !== undefined) {
      const alert = checkAnomaly(
        '浏览量',
        metrics.pageViews,
        metrics.yesterdayPageViews,
        configs.find(c => c.metric === 'pageViews') || DEFAULT_CONFIGS[3]
      )
      if (alert) newAlerts.push(alert)
    }

    // Check conversion rate
    if (metrics.conversionRate !== undefined && metrics.yesterdayConversionRate !== undefined) {
      const alert = checkAnomaly(
        '转化率',
        metrics.conversionRate,
        metrics.yesterdayConversionRate,
        configs.find(c => c.metric === 'conversionRate') || DEFAULT_CONFIGS[1]
      )
      if (alert) newAlerts.push(alert)
    }

    // Check bounce rate
    if (metrics.bounceRate !== undefined && metrics.yesterdayBounceRate !== undefined) {
      const alert = checkAnomaly(
        '跳出率',
        metrics.bounceRate,
        metrics.yesterdayBounceRate,
        configs.find(c => c.metric === 'bounceRate') || DEFAULT_CONFIGS[2]
      )
      if (alert) newAlerts.push(alert)
    }

    // Check inquiries
    if (metrics.inquiries !== undefined && metrics.yesterdayInquiries !== undefined) {
      const alert = checkAnomaly(
        '询盘数',
        metrics.inquiries,
        metrics.yesterdayInquiries,
        configs.find(c => c.metric === 'inquiries') || DEFAULT_CONFIGS[4]
      )
      if (alert) newAlerts.push(alert)
    }

    // Check leads
    if (metrics.leads !== undefined && metrics.yesterdayLeads !== undefined) {
      const alert = checkAnomaly(
        '线索数',
        metrics.leads,
        metrics.yesterdayLeads,
        configs.find(c => c.metric === 'leads') || DEFAULT_CONFIGS[4]
      )
      if (alert) newAlerts.push(alert)
    }

    setAlerts(newAlerts)
    setLastCheck(new Date())

    return newAlerts
  }, [metrics, configs])

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  // Dismiss a specific alert
  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }, [])

  // Auto-check on mount or when metrics change
  useEffect(() => {
    if (isEnabled && autoCheck) {
      checkAnomalies()
    }
  }, [metrics, isEnabled, autoCheck, checkAnomalies])

  return {
    alerts,
    lastCheck,
    isEnabled,
    setIsEnabled,
    checkAnomalies,
    clearAlerts,
    dismissAlert,
  }
}

// Export types and utilities
export type { AnomalyConfig, AnomalyAlert, MetricData }
