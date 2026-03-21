'use client'

import { useCallback } from 'react'

interface MetricsData {
  totalVisitors?: number
  totalPageViews?: number
  todayVisitors?: number
  yesterdayVisitors?: number
  conversionRate?: number
  avgDuration?: number
  bounceRate?: number
  inquiries?: number
  leads?: number
  topCountry?: string
}

interface AnomalyAlert {
  type: 'warning' | 'error' | 'info'
  message: string
  metric?: string
  value?: number
  threshold?: number
}

// Text to speech function
function speak(text: string, lang: string = 'zh-CN') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.9
  utterance.pitch = 1
  utterance.volume = 1

  window.speechSynthesis.speak(utterance)
}

// Format numbers for speech
function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return '暂无数据'
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`
  }
  return num.toLocaleString()
}

// Format percentage
function formatPercent(num: number | undefined): string {
  if (num === undefined || num === null) return '暂无数据'
  return `${num.toFixed(1)}%`
}

// Format duration (seconds to minutes:seconds)
function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '暂无数据'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins === 0) return `${secs}秒`
  return `${mins}分${secs}秒`
}

// Generate metrics report
function generateMetricsReport(data: MetricsData): string {
  const parts: string[] = []

  if (data.totalVisitors !== undefined) {
    parts.push(`总访客数 ${formatNumber(data.totalVisitors)}`)
  }

  if (data.todayVisitors !== undefined) {
    parts.push(`今日访客 ${formatNumber(data.todayVisitors)}`)
  }

  if (data.yesterdayVisitors !== undefined && data.todayVisitors !== undefined) {
    const change = ((data.todayVisitors - data.yesterdayVisitors) / data.yesterdayVisitors * 100).toFixed(1)
    const trend = data.todayVisitors >= data.yesterdayVisitors ? '增长' : '下降'
    parts.push(`较昨日${trend}${Math.abs(parseFloat(change))} percent`)
  }

  if (data.totalPageViews !== undefined) {
    parts.push(`总浏览量 ${formatNumber(data.totalPageViews)}`)
  }

  if (data.conversionRate !== undefined) {
    parts.push(`转化率 ${formatPercent(data.conversionRate)}`)
  }

  if (data.avgDuration !== undefined) {
    parts.push(`平均停留时长 ${formatDuration(data.avgDuration)}`)
  }

  if (data.bounceRate !== undefined) {
    parts.push(`跳出率 ${formatPercent(data.bounceRate)}`)
  }

  if (data.inquiries !== undefined) {
    parts.push(`询盘数 ${formatNumber(data.inquiries)}`)
  }

  if (data.leads !== undefined) {
    parts.push(`线索数 ${formatNumber(data.leads)}`)
  }

  if (data.topCountry) {
    parts.push(`访问最多的国家是 ${data.topCountry}`)
  }

  return parts.join('，')
}

// Generate anomaly alerts
function generateAnomalyAlerts(alerts: AnomalyAlert[]): string {
  if (!alerts || alerts.length === 0) return ''

  const messages: string[] = []

  alerts.forEach(alert => {
    if (alert.type === 'error') {
      messages.push(`严重警告：${alert.message}`)
    } else if (alert.type === 'warning') {
      messages.push(`提醒：${alert.message}`)
    }
  })

  return messages.join('，')
}

export function useMetricsSpeak() {
  // Speak all metrics
  const speakAllMetrics = useCallback((data: MetricsData) => {
    const report = generateMetricsReport(data)
    speak(`数据播报：${report}`)
  }, [])

  // Speak specific metric
  const speakMetric = useCallback((metricName: string, value: number | undefined, unit?: string) => {
    let text = ''
    switch (metricName) {
      case 'visitors':
        text = `当前访客数 ${formatNumber(value)}`
        break
      case 'pageViews':
        text = `当前浏览量 ${formatNumber(value)}`
        break
      case 'conversionRate':
        text = `当前转化率 ${formatPercent(value)}`
        break
      case 'duration':
        text = `平均停留时长 ${formatDuration(value as number)}`
        break
      case 'bounceRate':
        text = `跳出率 ${formatPercent(value)}`
        break
      case 'inquiries':
        text = `询盘数量 ${formatNumber(value)}`
        break
      case 'leads':
        text = `线索数量 ${formatNumber(value)}`
        break
      default:
        text = `${metricName} ${value ?? '暂无数据'}`
    }
    speak(text)
  }, [])

  // Speak anomaly alerts
  const speakAnomalies = useCallback((alerts: AnomalyAlert[]) => {
    const alertText = generateAnomalyAlerts(alerts)
    if (alertText) {
      speak(`数据预警：${alertText}`)
    }
  }, [])

  // Speak custom text
  const speakText = useCallback((text: string) => {
    speak(text)
  }, [])

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  return {
    speakAllMetrics,
    speakMetric,
    speakAnomalies,
    speakText,
    stopSpeaking,
  }
}

// Utility functions for external use
export { speak, formatNumber, formatPercent, formatDuration }
