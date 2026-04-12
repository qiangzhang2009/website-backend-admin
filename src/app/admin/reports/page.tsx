/**
 * 自动化报告页面 v3
 * 日报 / 周报 / 月报，支持AI深度分析、PDF导出
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Row, Col, Card, Table, Tag, Select, Spin, Progress, Empty, Button, Space, Statistic, message, Collapse } from 'antd'
import { ReloadOutlined, PrinterOutlined, DownloadOutlined, FileTextOutlined, FilePdfOutlined, RobotOutlined, AimOutlined } from '@ant-design/icons'
import 'dayjs/locale/zh-cn'
import { useTheme } from '@/components/AdminLayout'
import { useAIAnalysis } from '@/hooks/useAIAnalysis'
import PDFReportTemplate from '@/components/reports/PDFReportTemplate'

function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || 'zxqconsulting'
}

type PeriodType = 'daily' | 'weekly' | 'monthly'

interface ReportSummary {
  visitors: number; pageViews: number; sessions: number; activeVisitors: number
  toolUsers: number; toolInteractions: number; inquiries: number
  engagementRate: number; toolUsageRate: number; conversionRate: number
}

interface TrendRow { date: string; visitors: number; pageViews: number; sessions: number; inquiries: number }
interface TopPage { page: string; views: number; uniqueVisitors: number }
interface TopSource { source: string; visitors: number; pageViews: number }
interface TopTool { tool: string; total: number; completed: number; completionRate: number }
interface GeoItem { country: string; visitors: number }
interface Comparison { visitorsChange: number; pageViewsChange: number; inquiriesChange: number }

interface AIAnalysis {
  executiveSummary: string; keyFindings: string[]; trendAnalysis: string
  userBehaviorAnalysis: string; engagementInsights: string; opportunities: string[]
  recommendations: string[]; riskWarnings: string[]; nextPeriodForecast: string; industryContext: string
}

function ReportsPageWithSuspense() {
  const TENANT = useTenantFromURL()
  const { isDark, textPrimary, textSecondary, textMuted } = useTheme()
  const [period, setPeriod] = useState<PeriodType>('daily')
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<any>(null)
  const [showPdfTemplate, setShowPdfTemplate] = useState(false)
  const { analyzing, analysis, generateAnalysis, setAnalysis } = useAIAnalysis()

  const fetchReport = async (p: PeriodType = period) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports?tenant=${TENANT}&period=${p}`)
      const data = await res.json()
      if (data.error) {
        message.error(data.error)
      } else {
        setReportData(data)
        setAnalysis(null)
      }
    } catch (e) {
      console.error('Reports fetch error:', e)
      message.error('加载报告失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!TENANT) return
    fetchReport(period)
  }, [TENANT, period])

  const handlePeriodChange = (p: PeriodType) => {
    setPeriod(p)
    fetchReport(p)
  }

  const getChangeTag = (change: number) => {
    if (change === 0) return <Tag>持平</Tag>
    if (change > 0) return <Tag color="green">+{change}%</Tag>
    return <Tag color="red">{change}%</Tag>
  }

  const handlePrint = () => {
    setShowPdfTemplate(true)
    setTimeout(() => {
      window.print()
      setShowPdfTemplate(false)
    }, 500)
  }

  const handleExportPDF = () => {
    if (!reportData) return
    message.loading({ content: '正在生成PDF报告...', key: 'pdf' })
    setShowPdfTemplate(true)
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).exportReportPDF) {
        ;(window as any).exportReportPDF()
        message.success({ content: 'PDF报告已生成', key: 'pdf' })
        setTimeout(() => setShowPdfTemplate(false), 2000)
      } else {
        message.error({ content: 'PDF生成失败', key: 'pdf' })
        setShowPdfTemplate(false)
      }
    }, 500)
  }

  const handleExport = () => {
    if (!reportData) return
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportData.periodLabel}_${reportData.dateRange.start}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('报告导出成功')
  }

  const handleAIAnalysis = async () => {
    if (!reportData) return
    message.loading({ content: 'AI正在分析数据...', key: 'ai' })
    const result = await generateAnalysis(reportData)
    if (result) {
      message.success({ content: 'AI分析完成', key: 'ai' })
    } else {
      message.error({ content: 'AI分析失败，请重试', key: 'ai' })
    }
  }

  const statCards = [
    { label: '访客数', value: reportData?.summary?.visitors ?? 0, change: reportData?.comparison?.visitorsChange ?? 0, color: '#06b6d4', icon: '👥' },
    { label: '浏览量', value: reportData?.summary?.pageViews ?? 0, change: reportData?.comparison?.pageViewsChange ?? 0, color: '#8b5cf6', icon: '👁️' },
    { label: '会话数', value: reportData?.summary?.sessions ?? 0, change: 0, color: '#f59e0b', icon: '🔗' },
    { label: '工具使用', value: reportData?.summary?.toolInteractions ?? 0, change: 0, color: '#ec4899', icon: '🔧' },
    { label: '提交询盘', value: reportData?.summary?.inquiries ?? 0, change: reportData?.comparison?.inquiriesChange ?? 0, color: '#10b981', icon: '💬' },
    { label: '转化率', value: `${reportData?.summary?.conversionRate ?? 0}%`, change: 0, color: '#3b82f6', icon: '🎯' },
  ]

  const topPagesColumns = [
    { title: '页面', dataIndex: 'page', key: 'page', ellipsis: true, render: (v: string) => <span style={{ color: textSecondary, fontSize: 12 }}>{v}</span> },
    { title: '浏览', dataIndex: 'views', key: 'views', render: (v: number) => <span style={{ color: '#8b5cf6', fontWeight: 500 }}>{v}</span> },
    { title: '独立', dataIndex: 'uniqueVisitors', key: 'uniqueVisitors', render: (v: number) => <span style={{ color: '#06b6d4' }}>{v}</span> },
  ]

  const topSourcesColumns = [
    { title: '来源', dataIndex: 'source', key: 'source', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '访客', dataIndex: 'visitors', key: 'visitors', render: (v: number) => <span style={{ color: '#06b6d4', fontWeight: 500 }}>{v}</span> },
    { title: '浏览', dataIndex: 'pageViews', key: 'pageViews', render: (v: number) => <span style={{ color: textMuted }}>{v}</span> },
  ]

  const topToolsColumns = [
    { title: '工具', dataIndex: 'tool', key: 'tool', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '使用', dataIndex: 'total', key: 'total', render: (v: number) => <span style={{ color: textSecondary }}>{v}</span> },
    { title: '完成', dataIndex: 'completed', key: 'completed', render: (v: number) => <Tag color="green">{v}</Tag> },
    { title: '完成率', dataIndex: 'completionRate', key: 'completionRate', render: (v: number) => <Progress percent={v} size="small" strokeColor={v >= 70 ? '#10b981' : v >= 40 ? '#f59e0b' : '#ef4444'} trailColor={isDark ? '#374151' : '#e5e7eb'} style={{ width: 80 }} /> },
  ]

  const trendColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', render: (v: string) => <span style={{ color: textPrimary }}>{v}</span> },
    { title: <span style={{ color: '#06b6d4' }}>访客</span>, dataIndex: 'visitors', key: 'visitors', render: (v: number) => <span style={{ color: '#06b6d4', fontWeight: 500 }}>{v}</span> },
    { title: <span style={{ color: '#8b5cf6' }}>浏览</span>, dataIndex: 'pageViews', key: 'pageViews', render: (v: number) => <span style={{ color: '#8b5cf6' }}>{v}</span> },
    { title: <span style={{ color: '#f59e0b' }}>会话</span>, dataIndex: 'sessions', key: 'sessions', render: (v: number) => <span style={{ color: '#f59e0b' }}>{v}</span> },
    { title: <span style={{ color: '#10b981' }}>询盘</span>, dataIndex: 'inquiries', key: 'inquiries', render: (v: number) => <Tag color="green">{v}</Tag> },
  ]

  const collapseItems = analysis ? [
    { key: 'summary', label: <span style={{ color: '#22d3ee' }}><AimOutlined /> 执行摘要</span>, children: <p style={{ lineHeight: 1.8 }}>{analysis.executiveSummary}</p> },
    { key: 'findings', label: <span style={{ color: '#818cf8' }}>关键发现</span>, children: <ul style={{ paddingLeft: 20 }}>{analysis.keyFindings?.map((f, i) => <li key={i} style={{ marginBottom: 8 }}>{f}</li>)}</ul> },
    { key: 'trend', label: <span style={{ color: '#22d3ee' }}>趋势分析</span>, children: <p style={{ lineHeight: 1.8 }}>{analysis.trendAnalysis}</p> },
    { key: 'behavior', label: <span style={{ color: '#f472b6' }}>用户行为分析</span>, children: <p style={{ lineHeight: 1.8 }}>{analysis.userBehaviorAnalysis}</p> },
    { key: 'opportunities', label: <span style={{ color: '#10b981' }}>增长机会</span>, children: <ul style={{ paddingLeft: 20 }}>{analysis.opportunities?.map((o, i) => <li key={i} style={{ marginBottom: 8, color: '#86efac' }}>{o}</li>)}</ul> },
    { key: 'recommendations', label: <span style={{ color: '#fbbf24' }}>优化建议</span>, children: <ul style={{ paddingLeft: 20 }}>{analysis.recommendations?.map((r, i) => <li key={i} style={{ marginBottom: 8, padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 6 }}>{r}</li>)}</ul> },
    { key: 'risks', label: <span style={{ color: '#f87171' }}>风险提示</span>, children: <ul style={{ paddingLeft: 20 }}>{analysis.riskWarnings?.map((w, i) => <li key={i} style={{ marginBottom: 8, color: '#fca5a5' }}>⚠️ {w}</li>)}</ul> },
    { key: 'forecast', label: <span style={{ color: '#c084fc' }}>下期预测</span>, children: <p style={{ lineHeight: 1.8, padding: '12px 16px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: 8 }}>{analysis.nextPeriodForecast}</p> },
  ] : []

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" tip="生成报告中..." /></div>
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 头部 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileTextOutlined style={{ fontSize: 28, color: '#8b5cf6' }} />
            <div>
              <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>自动化报告</h2>
              <div style={{ color: textMuted, fontSize: 13, marginTop: 2 }}>
                {reportData?.dateRange?.start} ~ {reportData?.dateRange?.end}
                {reportData?.periodLabel && <Tag color="purple" style={{ marginLeft: 8 }}>{reportData.periodLabel}</Tag>}
              </div>
            </div>
          </div>
        </div>
        <Space wrap>
          <Select value={period} onChange={handlePeriodChange} style={{ width: 140 }} options={[{ value: 'daily', label: '日报' }, { value: 'weekly', label: '周报' }, { value: 'monthly', label: '月报' }]} />
          <Button icon={<ReloadOutlined />} onClick={() => fetchReport(period)}>刷新</Button>
          <Button icon={<RobotOutlined />} onClick={handleAIAnalysis} loading={analyzing} style={{ background: analysis ? undefined : 'linear-gradient(135deg, #667eea, #764ba2)', color: analysis ? undefined : '#fff', border: analysis ? undefined : 'none' }}>
            {analysis ? '重新分析' : 'AI深度分析'}
          </Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>打印</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出JSON</Button>
          <Button icon={<FilePdfOutlined />} type="primary" onClick={handleExportPDF}>导出PDF</Button>
        </Space>
      </div>

      {/* AI 执行摘要 */}
      {analysis && (
        <Card style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(99, 102, 241, 0.1))', border: '1px solid rgba(34, 211, 238, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <AimOutlined style={{ fontSize: 24, color: '#22d3ee' }} />
            <span style={{ fontSize: 18, fontWeight: 600, color: '#22d3ee' }}>AI 执行摘要</span>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: textPrimary, margin: 0 }}>{analysis.executiveSummary}</p>
        </Card>
      )}

      {/* 核心指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card, idx) => (
          <Col xs={12} sm={8} lg={2} key={idx}>
            <Card hoverable style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}dd)`, border: 'none' }} bodyStyle={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ color: '#fff', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{card.icon}</div>
                <div style={{ opacity: 0.9, fontSize: 12 }}>{card.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>
                  {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                </div>
                {card.change !== 0 && <div style={{ fontSize: 11, opacity: 0.85 }}>较上期 {getChangeTag(card.change)}</div>}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 参与度 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card><Statistic title={<span style={{ color: textMuted }}>活跃访客</span>} value={reportData?.summary?.activeVisitors ?? 0} suffix={`/ ${reportData?.summary?.visitors ?? 0}`} valueStyle={{ color: '#8b5cf6' }} /><Progress percent={reportData?.summary?.engagementRate ?? 0} strokeColor="#8b5cf6" trailColor={isDark ? '#374151' : '#e5e7eb'} format={(p) => <span style={{ color: textMuted }}>参与率 {p}%</span>} /></Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card><Statistic title={<span style={{ color: textMuted }}>工具用户</span>} value={reportData?.summary?.toolUsers ?? 0} suffix="人" valueStyle={{ color: '#f59e0b' }} /><Progress percent={reportData?.summary?.toolUsageRate ?? 0} strokeColor="#f59e0b" trailColor={isDark ? '#374151' : '#e5e7eb'} format={(p) => <span style={{ color: textMuted }}>使用率 {p}%</span>} /></Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card><Statistic title={<span style={{ color: textMuted }}>转化率</span>} value={reportData?.summary?.conversionRate ?? 0} suffix="%" precision={2} valueStyle={{ color: '#10b981' }} /><Progress percent={Math.min((reportData?.summary?.conversionRate ?? 0) * 10, 100)} strokeColor="#10b981" trailColor={isDark ? '#374151' : '#e5e7eb'} format={() => <span style={{ color: textMuted }}>访客→询盘</span>} /></Card>
        </Col>
      </Row>

      {/* AI 分析 */}
      {analysis && (
        <Card style={{ marginBottom: 24, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <Collapse items={collapseItems} defaultActiveKey={['summary']} />
        </Card>
      )}

      {/* 数据表格 */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title={<span style={{ color: textPrimary }}>每日趋势</span>}>
            {reportData?.dailyTrend?.length ? <Table dataSource={reportData.dailyTrend} rowKey="date" pagination={{ pageSize: 14 }} size="small" columns={trendColumns} /> : <Empty description="暂无数据" />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: textPrimary }}>热门页面</span>}>
            {reportData?.topPages?.length ? <Table dataSource={reportData.topPages} columns={topPagesColumns} pagination={{ pageSize: 10 }} rowKey="page" size="small" /> : <Empty description="暂无数据" />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: textPrimary }}>流量来源</span>}>
            {reportData?.topSources?.length ? <Table dataSource={reportData.topSources} columns={topSourcesColumns} pagination={false} rowKey="source" size="small" /> : <Empty description="暂无数据" />}
          </Card>
        </Col>
        <Col xs={24}>
          <Card title={<span style={{ color: textPrimary }}>工具使用</span>}>
            {reportData?.topTools?.length ? <Table dataSource={reportData.topTools} columns={topToolsColumns} pagination={false} rowKey="tool" size="small" /> : <Empty description="暂无数据" />}
          </Card>
        </Col>
        <Col xs={24}>
          <Card title={<span style={{ color: textPrimary }}>地域分布</span>}>
            {reportData?.geoDistribution?.length ? (
              <Row gutter={[8, 8]}>
                {reportData.geoDistribution.map((item: any, idx: number) => {
                  const max = Math.max(...reportData.geoDistribution.map((g: any) => g.visitors))
                  const pct = Math.round((item.visitors / max) * 100)
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={idx}>
                      <Card size="small" bodyStyle={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: textPrimary, fontWeight: 500 }}>{item.country}</span>
                          <span style={{ color: '#06b6d4', fontWeight: 600 }}>{item.visitors} 人</span>
                        </div>
                        <Progress percent={pct} size="small" strokeColor="#06b6d4" trailColor={isDark ? '#374151' : '#e5e7eb'} showInfo={false} />
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>
      </Row>

      {/* PDF模板 */}
      {showPdfTemplate && (
        <div style={{ position: 'fixed', left: -9999, top: 0, zIndex: -1 }}>
          <PDFReportTemplate reportData={reportData} aiAnalysis={analysis} loadingAnalysis={analyzing} />
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 50, textAlign: 'center' }}><Spin tip="加载中..." /></div>}>
      <ReportsPageWithSuspense />
    </Suspense>
  )
}
