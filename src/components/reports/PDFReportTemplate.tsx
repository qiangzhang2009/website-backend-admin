'use client'

/**
 * 专业PDF报告生成组件 v2
 * 科技感十足，包含AI深度分析和预测
 */

import React, { useRef, useEffect, useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

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
  comparison: {
    visitorsChange: number
    pageViewsChange: number
    inquiriesChange: number
  }
  dailyTrend: Array<{ date: string; visitors: number; pageViews: number; sessions: number; inquiries: number }>
  topPages: Array<{ page: string; views: number; uniqueVisitors: number }>
  topSources: Array<{ source: string; visitors: number; pageViews: number }>
  topTools: Array<{ tool: string; total: number; completed: number; completionRate: number }>
  geoDistribution: Array<{ country: string; visitors: number }>
}

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

interface Props {
  reportData: ReportData | null
  aiAnalysis: AIAnalysis | null
  loadingAnalysis?: boolean
}

export default function PDFReportTemplate({ reportData, aiAnalysis, loadingAnalysis }: Props) {
  const reportRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)

  const formatChange = (val: number) => {
    if (val > 0) return `+${val.toFixed(1)}%`
    if (val < 0) return `${val.toFixed(1)}%`
    return '持平'
  }

  const getChangeIcon = (val: number) => {
    if (val > 0) return '📈'
    if (val < 0) return '📉'
    return '➡️'
  }

  const handleExportPDF = async () => {
    if (!reportRef.current || !reportData) return

    setGenerating(true)
    try {
      const element = reportRef.current
      
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0f172a',
        logging: false,
        windowWidth: 1200,
      })

      const imgData = canvas.toDataURL('image/png', 1.0)
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * (pageWidth - 20)) / canvas.width + 10

      let heightLeft = imgHeight
      let position = 0

      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')

      while (heightLeft > 0) {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
        if (heightLeft > 0) {
          pdf.addPage()
          pdf.setFillColor(15, 23, 42)
          pdf.rect(0, 0, pageWidth, pageHeight, 'F')
          position = pageHeight - imgHeight
        }
      }

      const filename = `数据分析报告_${reportData.periodLabel}_${reportData.dateRange.start}.pdf`
      pdf.save(filename)
    } catch (error) {
      console.error('PDF export error:', error)
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    (window as any).exportReportPDF = handleExportPDF
    return () => {
      delete (window as any).exportReportPDF
    }
  }, [reportData, aiAnalysis])

  if (!reportData) return null

  return (
    <div 
      ref={reportRef}
      className="pdf-report"
      style={{ 
        width: '1200px',
        minHeight: '2400px',
        padding: '48px 56px',
        backgroundColor: '#0f172a',
        fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#f8fafc',
      }}
    >
      <style>{`
        .pdf-report * {
          box-sizing: border-box;
        }
        .pdf-report h1, .pdf-report h2, .pdf-report h3 {
          margin: 0;
        }
      `}</style>

      {/* 头部区域 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 50%, rgba(236, 72, 153, 0.2) 100%)',
        borderRadius: '24px',
        padding: '48px',
        marginBottom: '40px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 背景装饰 */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '72px',
                height: '72px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
              }}>
                📊
              </div>
              <div>
                <h1 style={{ 
                  fontSize: '40px', 
                  fontWeight: 800, 
                  letterSpacing: '-1px',
                  background: 'linear-gradient(135deg, #fff, #cbd5e1)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '8px',
                }}>
                  数据智能分析报告
                </h1>
                <p style={{ fontSize: '18px', color: '#94a3b8', margin: 0 }}>
                  Powered by DeepSeek AI
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                background: 'rgba(99, 102, 241, 0.3)',
                padding: '12px 20px',
                borderRadius: '12px',
                fontSize: '14px',
                color: '#c7d2fe',
                marginBottom: '8px',
              }}>
                {reportData.periodLabel}报告
              </div>
              <div style={{ fontSize: '15px', color: '#64748b' }}>
                {reportData.dateRange.start} — {reportData.dateRange.end}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginTop: '32px',
          }}>
            {[
              { label: '报告类型', value: reportData.periodLabel, color: '#818cf8' },
              { label: '数据周期', value: `${reportData.dateRange.start} ~ ${reportData.dateRange.end}`, color: '#c084fc' },
              { label: '生成时间', value: new Date().toLocaleString('zh-CN'), color: '#f472b6' },
              { label: '技术支持', value: 'DeepSeek AI', color: '#22d3ee' },
            ].map((item, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '13px', color: item.color, fontWeight: 600 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI 执行摘要 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        border: '1px solid rgba(34, 211, 238, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <span style={{ fontSize: '28px' }}>🎯</span>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#22d3ee' }}>执行摘要</h2>
        </div>
        {loadingAnalysis ? (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#64748b',
            fontSize: '14px',
          }}>
            🔄 AI 正在分析数据，请稍候...
          </div>
        ) : aiAnalysis?.executiveSummary ? (
          <p style={{ 
            fontSize: '16px', 
            lineHeight: 1.8,
            color: '#e2e8f0',
            margin: 0,
          }}>
            {aiAnalysis.executiveSummary}
          </p>
        ) : (
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            暂无AI分析数据
          </p>
        )}
      </div>

      {/* 核心指标 */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          fontSize: '22px', 
          fontWeight: 700, 
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '28px' }}>📈</span>
          核心数据指标
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
          {/* 访客 */}
          <div style={{
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            borderRadius: '20px',
            padding: '28px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: '-30%',
              right: '-20%',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
            }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>👥 访客总数</div>
              <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '8px' }}>
                {reportData.summary.visitors.toLocaleString()}
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: reportData.comparison.visitorsChange >= 0 ? '#bbf7d0' : '#fecaca',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                {getChangeIcon(reportData.comparison.visitorsChange)} 较上期 {formatChange(reportData.comparison.visitorsChange)}
              </div>
            </div>
          </div>

          {/* 浏览 */}
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            borderRadius: '20px',
            padding: '28px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: '-30%',
              right: '-20%',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
            }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>👁️ 页面浏览</div>
              <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '8px' }}>
                {reportData.summary.pageViews.toLocaleString()}
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: reportData.comparison.pageViewsChange >= 0 ? '#bbf7d0' : '#fecaca',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                {getChangeIcon(reportData.comparison.pageViewsChange)} 较上期 {formatChange(reportData.comparison.pageViewsChange)}
              </div>
            </div>
          </div>

          {/* 会话 */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: '20px',
            padding: '28px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: '-30%',
              right: '-20%',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
            }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>🔗 会话总数</div>
              <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '8px' }}>
                {reportData.summary.sessions.toLocaleString()}
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                独立会话
              </div>
            </div>
          </div>
        </div>

        {/* 次要指标 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px',
          marginBottom: '24px',
        }}>
          {[
            { label: '🔧 工具使用', value: reportData.summary.toolInteractions, unit: '次', color: '#ec4899' },
            { label: '💬 提交询盘', value: reportData.summary.inquiries, unit: '个', color: '#10b981' },
            { label: '⚡ 活跃访客', value: reportData.summary.activeVisitors, unit: '人', color: '#3b82f6' },
            { label: '🎯 转化率', value: reportData.summary.conversionRate, unit: '%', color: '#6366f1' },
          ].map((item, idx) => (
            <div key={idx} style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>{item.label}</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: item.color }}>
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                <span style={{ fontSize: '14px', fontWeight: 400 }}>{item.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 参与度指标 */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '16px',
          padding: '28px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: '#e2e8f0' }}>
            📊 参与度分析
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
            {[
              { label: '访客参与率', value: reportData.summary.engagementRate, color: '#8b5cf6' },
              { label: '工具使用率', value: reportData.summary.toolUsageRate, color: '#f59e0b' },
              { label: '询盘转化率', value: reportData.summary.conversionRate * 10, color: '#10b981' },
            ].map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', color: '#94a3b8' }}>{item.label}</span>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: item.color }}>
                    {item.value.toFixed(1)}%
                  </span>
                </div>
                <div style={{ 
                  height: '10px', 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '5px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.min(item.value, 100)}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${item.color}, ${item.color}88)`,
                    borderRadius: '5px',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI 深度分析 */}
      {aiAnalysis && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ 
            fontSize: '22px', 
            fontWeight: 700, 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '28px' }}>🤖</span>
            AI 深度分析
          </h2>

          <div style={{ display: 'grid', gap: '20px' }}>
            {/* 关键发现 */}
            {aiAnalysis.keyFindings?.length > 0 && (
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  marginBottom: '16px',
                  color: '#818cf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  💡 关键发现
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {aiAnalysis.keyFindings.map((finding, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 16px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      borderRadius: '10px',
                    }}>
                      <span style={{ 
                        color: '#818cf8', 
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>{idx + 1}.</span>
                      <span style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.6 }}>
                        {finding}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 趋势分析 */}
            {aiAnalysis.trendAnalysis && (
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(34, 211, 238, 0.3)',
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  marginBottom: '16px',
                  color: '#22d3ee',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  📈 趋势分析
                </h3>
                <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.8, margin: 0 }}>
                  {aiAnalysis.trendAnalysis}
                </p>
              </div>
            )}

            {/* 用户行为分析 */}
            {aiAnalysis.userBehaviorAnalysis && (
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(236, 72, 153, 0.3)',
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  marginBottom: '16px',
                  color: '#f472b6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  👤 用户行为分析
                </h3>
                <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.8, margin: 0 }}>
                  {aiAnalysis.userBehaviorAnalysis}
                </p>
              </div>
            )}

            {/* 增长机会 */}
            {aiAnalysis.opportunities?.length > 0 && (
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  marginBottom: '16px',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  🚀 增长机会
                </h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {aiAnalysis.opportunities.map((opp, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      color: '#86efac',
                    }}>
                      <span style={{ color: '#10b981' }}>▸</span>
                      {opp}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 建议 */}
            {aiAnalysis.recommendations?.length > 0 && (
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  marginBottom: '16px',
                  color: '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  💡 优化建议
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {aiAnalysis.recommendations.map((rec, idx) => (
                    <div key={idx} style={{
                      padding: '14px 18px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      borderRadius: '10px',
                      borderLeft: '3px solid #f59e0b',
                    }}>
                      <span style={{ 
                        color: '#fbbf24', 
                        fontWeight: 600,
                        marginRight: '8px',
                      }}>[{idx + 1}]</span>
                      <span style={{ fontSize: '14px', color: '#e2e8f0' }}>
                        {rec}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 风险提示 */}
            {aiAnalysis.riskWarnings?.length > 0 && (
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  marginBottom: '16px',
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  ⚠️ 风险提示
                </h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {aiAnalysis.riskWarnings.map((risk, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      color: '#fca5a5',
                    }}>
                      <span style={{ color: '#ef4444' }}>⚠</span>
                      {risk}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 预测 */}
            {aiAnalysis.nextPeriodForecast && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(168, 85, 247, 0.4)',
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  marginBottom: '16px',
                  color: '#c084fc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  🔮 下期预测
                </h3>
                <p style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.8, margin: 0 }}>
                  {aiAnalysis.nextPeriodForecast}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 每日趋势 */}
      {reportData.dailyTrend?.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ 
            fontSize: '22px', 
            fontWeight: 700, 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '28px' }}>📅</span>
            每日数据趋势
          </h2>
          
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                  {['日期', '访客', '浏览', '会话', '询盘'].map((h, i) => (
                    <th key={i} style={{ 
                      padding: '14px 16px', 
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '13px',
                      color: '#94a3b8',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.dailyTrend.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '14px 16px', color: '#cbd5e1', fontSize: '14px' }}>{row.date}</td>
                    <td style={{ padding: '14px 16px', color: '#22d3ee', fontWeight: 600, fontSize: '14px' }}>{row.visitors}</td>
                    <td style={{ padding: '14px 16px', color: '#818cf8', fontWeight: 600, fontSize: '14px' }}>{row.pageViews}</td>
                    <td style={{ padding: '14px 16px', color: '#fbbf24', fontSize: '14px' }}>{row.sessions}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        background: row.inquiries > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                        color: row.inquiries > 0 ? '#10b981' : '#64748b',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}>
                        {row.inquiries}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 双栏数据 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
        {/* 热门页面 */}
        {reportData.topPages?.length > 0 && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              marginBottom: '20px',
              color: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              🌐 热门页面 Top 10
            </h3>
            <div style={{ maxHeight: '280px', overflow: 'auto' }}>
              {reportData.topPages.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: idx < reportData.topPages.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                }}>
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#94a3b8', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                    }}>
                      {item.page}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
                    <span style={{ color: '#818cf8', fontWeight: 600, fontSize: '13px' }}>{item.views}次</span>
                    <span style={{ color: '#22d3ee', fontSize: '13px' }}>{item.uniqueVisitors}人</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 流量来源 */}
        {reportData.topSources?.length > 0 && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              marginBottom: '20px',
              color: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              🔍 流量来源 Top 8
            </h3>
            <div style={{ maxHeight: '280px', overflow: 'auto' }}>
              {reportData.topSources.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: idx < reportData.topSources.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                }}>
                  <span style={{
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: '#a5b4fc',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}>
                    {item.source}
                  </span>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ color: '#22d3ee', fontWeight: 600, fontSize: '13px' }}>{item.visitors}人</span>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>{item.pageViews}次</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 工具使用 */}
      {reportData.topTools?.length > 0 && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '40px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            marginBottom: '20px',
            color: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            🛠️ 工具使用排行 Top 5
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            {reportData.topTools.map((item, idx) => (
              <div key={idx} style={{
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '12px',
                padding: '18px',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                  {item.tool}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#818cf8' }}>
                  {item.total}
                </div>
                <div style={{ fontSize: '11px', color: '#10b981', marginTop: '6px' }}>
                  完成 {item.completed} 次
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 地域分布 */}
      {reportData.geoDistribution?.length > 0 && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '40px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            marginBottom: '20px',
            color: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            🌍 访客地域分布 Top 5
          </h3>
          <div style={{ display: 'flex', gap: '16px' }}>
            {reportData.geoDistribution.map((item, idx) => {
              const maxVisitors = Math.max(...reportData.geoDistribution.map(g => g.visitors))
              const pct = Math.round((item.visitors / maxVisitors) * 100)
              return (
                <div key={idx} style={{
                  flex: 1,
                  background: 'rgba(34, 211, 238, 0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(34, 211, 238, 0.2)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                    {item.country}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#22d3ee' }}>
                    {item.visitors}
                  </div>
                  <div style={{ 
                    height: '6px', 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: '3px',
                    marginTop: '12px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #06b6d4, #22d3ee)',
                      borderRadius: '3px',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 页脚 */}
      <div style={{
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ color: '#64748b', fontSize: '12px' }}>
          本报告由 zxqconsulting.com 数据智能分析系统生成
        </div>
        <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#64748b' }}>
          <span>📧 customer@zxqconsulting.com</span>
          <span>🌐 www.zxqconsulting.com</span>
        </div>
      </div>
    </div>
  )
}
