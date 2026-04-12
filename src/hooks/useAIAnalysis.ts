/**
 * DeepSeek AI 数据分析 Hook
 * 前端直接调用，绕过 Vercel 超时限制
 */

import { useState, useCallback } from 'react'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_API_KEY = 'sk-0c0f36c54b80440b892fc68a308cba7b'

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
      const prompt = buildPrompt(reportData)
      
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是专业数据分析师，用JSON格式返回分析结果，包含以下字段：
{"executiveSummary":"2-3句中文摘要","keyFindings":["发现1","发现2","发现3"],"trendAnalysis":"趋势分析","userBehaviorAnalysis":"用户行为分析","opportunities":["增长机会1","增长机会2"],"recommendations":["建议1","建议2","建议3"],"riskWarnings":["风险1"],"nextPeriodForecast":"下期预测","industryContext":"行业背景"}
只输出JSON格式，不要其他文字。`
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.6,
          max_tokens: 2000,
        })
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const result = await response.json()
      const content = result.choices?.[0]?.message?.content || ''
      
      // 解析 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        setAnalysis(parsed)
        return parsed
      }
      
      throw new Error('Failed to parse response')
    } catch (error) {
      console.error('AI Analysis error:', error)
      return null
    } finally {
      setAnalyzing(false)
    }
  }, [])

  return { analyzing, analysis, generateAnalysis, setAnalysis }
}

function buildPrompt(data: ReportData): string {
  const { summary, comparison, dailyTrend, topPages, topSources, topTools, geoDistribution, periodLabel, dateRange } = data
  
  const engagementRate = summary.visitors > 0 ? ((summary.activeVisitors / summary.visitors) * 100).toFixed(1) : '0'
  const conversionRate = summary.visitors > 0 ? ((summary.inquiries / summary.visitors) * 100).toFixed(2) : '0'

  return `
分析以下网站运营数据，生成深度分析报告：

【基本信息】
- 报告周期：${periodLabel}
- 时间：${dateRange?.start} 至 ${dateRange?.end}

【核心指标】
- 访客：${summary.visitors}人（环比${comparison.visitorsChange > 0 ? '+' : ''}${comparison.visitorsChange.toFixed(1)}%）
- 浏览：${summary.pageViews}次（环比${comparison.pageViewsChange > 0 ? '+' : ''}${comparison.pageViewsChange.toFixed(1)}%）
- 会话：${summary.sessions}次
- 活跃访客：${summary.activeVisitors}人（参与率${engagementRate}%）
- 工具用户：${summary.toolUsers}人，${summary.toolInteractions}次交互
- 询盘：${summary.inquiries}个（转化率${conversionRate}%）

【每日趋势】${dailyTrend?.map(d => `${d.date}: 访客${d.visitors}, 浏览${d.pageViews}`).join('; ') || '无'}

【热门页面】${topPages?.slice(0,3).map((p,i) => `${i+1}.${p.page}(${p.views}次)`).join('; ') || '无'}

【流量来源】${topSources?.map(s => `${s.source}(${s.visitors}人)`).join('; ') || '无'}

【工具使用】${topTools?.map(t => `${t.tool}(${t.total}次)`).join('; ') || '无'}

【地域分布】${geoDistribution?.map(g => `${g.country}(${g.visitors}人)`).join('; ') || '无'}

请给出：执行摘要、关键发现、趋势分析、用户行为洞察、增长机会、优化建议、风险提示、下期预测。
`
}
