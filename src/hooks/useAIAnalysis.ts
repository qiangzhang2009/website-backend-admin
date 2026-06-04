/**
 * DeepSeek AI 数据分析 Hook
 * 前端直接调用，绕过 Vercel 超时限制
 * API Key 从环境变量读取，通过后端代理转发
 */

import { useState, useCallback } from 'react'

const AI_PROXY_URL = '/api/ai/report-analysis'

interface AIAnalysis {
  executiveSummary: string
  keyFindings: string[]
  trendAnalysis: string
  userBehaviorAnalysis: string
  engagementInsights: string
  opportunities: string[]
  recommendations: string[]
  riskWarnings: string[]
  nextPeriodForecast: string
  industryContext: string
}

interface ReportData {
  periodLabel: string
  dateRange: { start: string; end: string }
  summary: {
    visitors: number
    pageViews: number
    sessions: number
    activeVisitors: number
    toolUsers: number
    toolInteractions: number
    inquiries: number
    engagementRate: number
    toolUsageRate: number
    conversionRate: number
  }
  comparison: { visitorsChange: number; pageViewsChange: number; inquiriesChange: number }
  dailyTrend: Array<{ date: string; visitors: number; pageViews: number; sessions: number; inquiries: number }>
  topPages: Array<{ page: string; views: number; uniqueVisitors: number }>
  topSources: Array<{ source: string; visitors: number; pageViews: number }>
  topTools: Array<{ tool: string; total: number; completed: number; completionRate: number }>
  geoDistribution: Array<{ country: string; visitors: number }>
}

export function useAIAnalysis() {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)

  const generateAnalysis = useCallback(async (reportData: ReportData): Promise<AIAnalysis | null> => {
    setAnalyzing(true)

    try {
      const response = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportData }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'API request failed')
      }

      const result = await response.json()
      if (result.analysis) {
        setAnalysis(result.analysis)
        return result.analysis
      }

      throw new Error('No analysis in response')
    } catch (error) {
      console.error('AI Analysis error:', error)
      return null
    } finally {
      setAnalyzing(false)
    }
  }, [])

  return { analyzing, analysis, generateAnalysis, setAnalysis }
}
