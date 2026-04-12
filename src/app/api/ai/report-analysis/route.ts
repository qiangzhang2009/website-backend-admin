/**
 * DeepSeek AI 数据分析 API
 * 生成深度分析、归纳总结、建议和预测
 */

export const runtime = 'edge'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-0c0f36c54b80440b892fc68a308cba7b'

export async function POST(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  try {
    const body = await request.json()
    const { reportData, tenantSlug } = body

    if (!reportData) {
      return new Response(JSON.stringify({ error: 'Missing report data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // 构建分析提示词
    const prompt = buildAnalysisPrompt(reportData)

    // 调用 DeepSeek API，简化提示词加快响应
    const response = await Promise.race([
      fetch(DEEPSEEK_API_URL, {
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
              content: `你是专业数据分析师，用JSON格式返回分析结果：
{"executiveSummary":"2-3句摘要","keyFindings":["发现1","发现2"],"trendAnalysis":"趋势分析","userBehaviorAnalysis":"用户行为","opportunities":["机会1"],"recommendations":["建议1"],"riskWarnings":["风险1"],"nextPeriodForecast":"预测","industryContext":"行业背景"}
只用中文回答。`
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.6,
          max_tokens: 2000,
        })
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 25000))
    ]) as Response

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API error:', errorText)
      return new Response(JSON.stringify({ error: 'AI分析服务暂时不可用' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const result = await response.json()
    const analysisText = result.choices?.[0]?.message?.content || ''

    // 解析AI返回的JSON
    let analysis = null
    try {
      // 尝试提取JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // 如果解析失败，返回原始文本
      analysis = {
        executiveSummary: analysisText.substring(0, 500),
        keyFindings: ['数据已获取，请查看原始分析'],
        recommendations: ['建议稍后重试获取完整分析']
      }
    }

    console.log('[AI Analysis] Analysis completed for tenant:', tenantSlug)

    return new Response(JSON.stringify({
      success: true,
      analysis,
      generatedAt: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (error) {
    console.error('[AI Analysis] Error:', error)
    return new Response(JSON.stringify({ 
      error: '分析生成失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

function buildAnalysisPrompt(data: any): string {
  const { summary, comparison, dailyTrend, topPages, topSources, topTools, geoDistribution, periodLabel, dateRange } = data

  // 计算一些衍生指标
  const avgDailyVisitors = dailyTrend?.length > 0 
    ? Math.round(summary.visitors / dailyTrend.length) 
    : summary.visitors
  const avgDailyPV = dailyTrend?.length > 0 
    ? Math.round(summary.pageViews / dailyTrend.length) 
    : summary.pageViews
  const engagementRate = summary.visitors > 0 
    ? ((summary.activeVisitors / summary.visitors) * 100).toFixed(1) 
    : '0'
  const conversionRate = summary.visitors > 0 
    ? ((summary.inquiries / summary.visitors) * 100).toFixed(2) 
    : '0'

  return `
请对以下网站运营数据进行深度分析：

## 报告基本信息
- 报告周期：${periodLabel}
- 时间范围：${dateRange?.start} 至 ${dateRange?.end}
- 租户：zxqconsulting.com

## 核心指标汇总
- 访客总数：${summary.visitors} 人
- 页面浏览量：${summary.pageViews} 次
- 会话数：${summary.sessions} 次
- 活跃访客：${summary.activeVisitors} 人（参与率 ${engagementRate}%）
- 工具使用用户：${summary.toolUsers} 人
- 工具交互次数：${summary.toolInteractions} 次
- 提交询盘：${summary.inquiries} 个
- 转化率：${conversionRate}%

## 环比变化
- 访客变化：${comparison.visitorsChange > 0 ? '+' : ''}${comparison.visitorsChange}%
- 浏览量变化：${comparison.pageViewsChange > 0 ? '+' : ''}${comparison.pageViewsChange}%
- 询盘变化：${comparison.inquiriesChange > 0 ? '+' : ''}${comparison.inquiriesChange}%

## 每日趋势数据
${dailyTrend?.map((d: any) => `- ${d.date}: 访客${d.visitors}人, 浏览${d.pageViews}次, 会话${d.sessions}次, 询盘${d.inquiries}个`).join('\n') || '暂无数据'}

## Top页面
${topPages?.slice(0, 5).map((p: any, i: number) => `${i+1}. ${p.page} (${p.views}次浏览, ${p.uniqueVisitors}独立访客)`).join('\n') || '暂无数据'}

## 流量来源
${topSources?.map((s: any) => `- ${s.source}: ${s.visitors}访客, ${s.pageViews}浏览`).join('\n') || '暂无数据'}

## 工具使用排行
${topTools?.map((t: any) => `- ${t.tool}: 使用${t.total}次, 完成${t.completed}次 (完成率${t.completionRate}%)`).join('\n') || '暂无数据'}

## 地域分布
${geoDistribution?.map((g: any) => `- ${g.country}: ${g.visitors}访客`).join('\n') || '暂无数据'}

## 分析要求
1. 深度分析数据变化趋势和原因
2. 分析用户行为模式和偏好
3. 识别增长机会和潜在风险
4. 提出具体可执行的建议
5. 预测下期关键指标
6. 结合行业背景给出洞察
`
}
