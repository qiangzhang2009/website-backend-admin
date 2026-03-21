/**
 * 自动化报告页面
 * 日报 / 周报 / 月报，支持一键生成、打印、导出
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Row, Col, Card, Table, Tag, Select, Spin, Progress, Empty, Button, Space, Statistic, message } from 'antd'
import { ReloadOutlined, PrinterOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { useTheme } from '@/components/AdminLayout'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || 'zxqconsulting'
}

type PeriodType = 'daily' | 'weekly' | 'monthly'

interface ReportSummary {
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

interface TrendRow { date: string; visitors: number; pageViews: number; sessions: number; inquiries: number }
interface TopPage { page: string; views: number; uniqueVisitors: number }
interface TopSource { source: string; visitors: number; pageViews: number }
interface TopTool { tool: string; total: number; completed: number; completionRate: number }
interface GeoItem { country: string; visitors: number }
interface Comparison { visitorsChange: number; pageViewsChange: number; inquiriesChange: number }

function ReportsPageWithSuspense() {
  const TENANT = useTenantFromURL()
  const { isDark, textPrimary, textSecondary, textMuted, successColor, errorColor, warningColor, infoColor } = useTheme()
  const [period, setPeriod] = useState<PeriodType>('daily')
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<{
    periodLabel: string
    dateRange: { start: string; end: string }
    summary: ReportSummary
    comparison: Comparison
    dailyTrend: TrendRow[]
    topPages: TopPage[]
    topSources: TopSource[]
    topTools: TopTool[]
    geoDistribution: GeoItem[]
  } | null>(null)

  const fetchReport = async (p: PeriodType = period) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports?tenant=${TENANT}&period=${p}`)
      const data = await res.json()
      if (data.error) {
        message.error(data.error)
      } else {
        setReportData(data)
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

  const getChangeColor = (change: number) => {
    if (change > 0) return successColor
    if (change < 0) return errorColor
    return textMuted
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    if (!reportData) return
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportData.periodLabel}_${reportData.dateRange.start}_${reportData.dateRange.end}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('报告导出成功')
  }

  // 指标卡片
  const statCards = [
    {
      label: '访客数',
      value: reportData?.summary.visitors ?? 0,
      change: reportData?.comparison.visitorsChange ?? 0,
      color: '#06b6d4',
      icon: '👥',
      changeLabel: '较上期',
    },
    {
      label: '浏览量',
      value: reportData?.summary.pageViews ?? 0,
      change: reportData?.comparison.pageViewsChange ?? 0,
      color: '#8b5cf6',
      icon: '👁️',
      changeLabel: '较上期',
    },
    {
      label: '会话数',
      value: reportData?.summary.sessions ?? 0,
      change: 0,
      color: '#f59e0b',
      icon: '🔗',
      changeLabel: '较上期',
    },
    {
      label: '工具使用',
      value: reportData?.summary.toolInteractions ?? 0,
      change: 0,
      color: '#06b6d4',
      icon: '🔧',
      changeLabel: '次互动',
    },
    {
      label: '提交询盘',
      value: reportData?.summary.inquiries ?? 0,
      change: reportData?.comparison.inquiriesChange ?? 0,
      color: '#10b981',
      icon: '💬',
      changeLabel: '较上期',
    },
    {
      label: '转化率',
      value: `${reportData?.summary.conversionRate ?? 0}%`,
      change: 0,
      color: '#3b82f6',
      icon: '🎯',
      changeLabel: '访客→询盘',
    },
  ]

  const topPagesColumns = [
    {
      title: '页面',
      dataIndex: 'page',
      key: 'page',
      ellipsis: true,
      render: (v: string) => <span style={{ color: textSecondary, fontSize: 12 }}>{v}</span>,
    },
    {
      title: '浏览次数',
      dataIndex: 'views',
      key: 'views',
      sorter: (a: TopPage, b: TopPage) => a.views - b.views,
      render: (v: number) => <span style={{ color: '#8b5cf6', fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '独立访客',
      dataIndex: 'uniqueVisitors',
      key: 'uniqueVisitors',
      render: (v: number) => <span style={{ color: '#06b6d4' }}>{v}</span>,
    },
  ]

  const topSourcesColumns = [
    {
      title: '流量来源',
      dataIndex: 'source',
      key: 'source',
      render: (v: string) => <Tag color="purple">{v}</Tag>,
    },
    {
      title: '访客数',
      dataIndex: 'visitors',
      key: 'visitors',
      sorter: (a: TopSource, b: TopSource) => a.visitors - b.visitors,
      render: (v: number) => <span style={{ color: '#06b6d4', fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '浏览量',
      dataIndex: 'pageViews',
      key: 'pageViews',
      render: (v: number) => <span style={{ color: textMuted }}>{v}</span>,
    },
  ]

  const topToolsColumns = [
    {
      title: '工具名称',
      dataIndex: 'tool',
      key: 'tool',
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '使用次数',
      dataIndex: 'total',
      key: 'total',
      sorter: (a: TopTool, b: TopTool) => a.total - b.total,
      render: (v: number) => <span style={{ color: textSecondary }}>{v}</span>,
    },
    {
      title: '完成次数',
      dataIndex: 'completed',
      key: 'completed',
      render: (v: number) => <Tag color="green">{v}</Tag>,
    },
    {
      title: '完成率',
      dataIndex: 'completionRate',
      key: 'completionRate',
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={v >= 70 ? '#10b981' : v >= 40 ? '#f59e0b' : '#ef4444'}
          trailColor={isDark ? '#374151' : '#e5e7eb'}
          style={{ width: 80 }}
        />
      ),
    },
  ]

  const trendColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (v: string) => <span style={{ color: textPrimary }}>{v}</span>,
    },
    {
      title: <span style={{ color: '#06b6d4' }}>访客</span>,
      dataIndex: 'visitors',
      key: 'visitors',
      render: (v: number) => <span style={{ color: '#06b6d4', fontWeight: 500 }}>{v}</span>,
    },
    {
      title: <span style={{ color: '#8b5cf6' }}>浏览</span>,
      dataIndex: 'pageViews',
      key: 'pageViews',
      render: (v: number) => <span style={{ color: '#8b5cf6' }}>{v}</span>,
    },
    {
      title: <span style={{ color: '#f59e0b' }}>会话</span>,
      dataIndex: 'sessions',
      key: 'sessions',
      render: (v: number) => <span style={{ color: '#f59e0b' }}>{v}</span>,
    },
    {
      title: <span style={{ color: '#10b981' }}>询盘</span>,
      dataIndex: 'inquiries',
      key: 'inquiries',
      render: (v: number) => <Tag color="green">{v}</Tag>,
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" tip="生成报告中..." />
      </div>
    )
  }

  return (
    <div>
      {/* 报告头部 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileTextOutlined style={{ fontSize: 28, color: '#8b5cf6' }} />
            <div>
              <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>自动化报告</h2>
              <div style={{ color: textMuted, fontSize: 13, marginTop: 2 }}>
                {reportData?.dateRange.start} ~ {reportData?.dateRange.end}
                {reportData?.periodLabel && <Tag color="purple" style={{ marginLeft: 8 }}>{reportData.periodLabel}</Tag>}
              </div>
            </div>
          </div>
        </div>
        <Space>
          <Select
            value={period}
            onChange={handlePeriodChange}
            style={{ width: 140 }}
            options={[
              { value: 'daily', label: '日报' },
              { value: 'weekly', label: '周报' },
              { value: 'monthly', label: '月报' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetchReport(period)}>刷新</Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>打印</Button>
          <Button icon={<DownloadOutlined />} type="primary" onClick={handleExport}>导出</Button>
        </Space>
      </div>

      {/* 核心指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card, idx) => (
          <Col xs={12} sm={8} lg={4} key={idx}>
            <Card
              hoverable
              style={{
                background: `linear-gradient(135deg, ${card.color}, ${card.color}dd)`,
                border: 'none',
              }}
              bodyStyle={{ padding: '16px', textAlign: 'center' }}
            >
              <div style={{ color: '#fff', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{card.icon}</div>
                <div style={{ opacity: 0.9, fontSize: 12 }}>{card.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>
                  {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                </div>
                {card.change !== 0 && (
                  <div style={{ fontSize: 11, opacity: 0.85 }}>
                    {card.changeLabel} {getChangeTag(card.change)}
                  </div>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 参与度指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={<span style={{ color: textMuted }}>活跃访客（浏览≥3页）</span>}
              value={reportData?.summary.activeVisitors ?? 0}
              suffix={`/ ${reportData?.summary.visitors ?? 0} 访客`}
              valueStyle={{ color: '#8b5cf6' }}
            />
            <Progress
              percent={reportData?.summary.engagementRate ?? 0}
              strokeColor="#8b5cf6"
              trailColor={isDark ? '#374151' : '#e5e7eb'}
              style={{ marginTop: 8 }}
              format={(p) => <span style={{ color: textMuted }}>参与率 {p}%</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={<span style={{ color: textMuted }}>工具使用用户</span>}
              value={reportData?.summary.toolUsers ?? 0}
              suffix="人"
              valueStyle={{ color: '#f59e0b' }}
            />
            <Progress
              percent={reportData?.summary.toolUsageRate ?? 0}
              strokeColor="#f59e0b"
              trailColor={isDark ? '#374151' : '#e5e7eb'}
              style={{ marginTop: 8 }}
              format={(p) => <span style={{ color: textMuted }}>使用率 {p}%</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={<span style={{ color: textMuted }}>转化率</span>}
              value={reportData?.summary.conversionRate ?? 0}
              suffix="%"
              precision={2}
              valueStyle={{ color: '#10b981' }}
            />
            <Progress
              percent={Math.min((reportData?.summary.conversionRate ?? 0) * 10, 100)}
              strokeColor="#10b981"
              trailColor={isDark ? '#374151' : '#e5e7eb'}
              style={{ marginTop: 8 }}
              format={() => <span style={{ color: textMuted }}>访客→询盘转化</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* 数据表格区域 */}
      <Row gutter={[16, 16]}>
        {/* 每日趋势 */}
        <Col xs={24}>
          <Card title={<span style={{ color: textPrimary }}>每日数据趋势</span>}>
            {reportData?.dailyTrend && reportData.dailyTrend.length > 0 ? (
              <Table
                dataSource={reportData.dailyTrend}
                rowKey="date"
                pagination={{ pageSize: 14 }}
                size="small"
                columns={trendColumns}
              />
            ) : (
              <Empty description="暂无趋势数据" />
            )}
          </Card>
        </Col>

        {/* Top 页面 */}
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: textPrimary }}>热门页面 Top 10</span>}>
            {reportData?.topPages && reportData.topPages.length > 0 ? (
              <Table
                dataSource={reportData.topPages}
                columns={topPagesColumns}
                pagination={{ pageSize: 10 }}
                rowKey="page"
                size="small"
              />
            ) : (
              <Empty description="暂无页面数据" />
            )}
          </Card>
        </Col>

        {/* Top 来源 */}
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: textPrimary }}>流量来源 Top 8</span>}>
            {reportData?.topSources && reportData.topSources.length > 0 ? (
              <Table
                dataSource={reportData.topSources}
                columns={topSourcesColumns}
                pagination={false}
                rowKey="source"
                size="small"
              />
            ) : (
              <Empty description="暂无来源数据" />
            )}
          </Card>
        </Col>

        {/* Top 工具 */}
        <Col xs={24}>
          <Card title={<span style={{ color: textPrimary }}>工具使用排行 Top 5</span>}>
            {reportData?.topTools && reportData.topTools.length > 0 ? (
              <Table
                dataSource={reportData.topTools}
                columns={topToolsColumns}
                pagination={false}
                rowKey="tool"
                size="small"
              />
            ) : (
              <Empty description="暂无工具数据" />
            )}
          </Card>
        </Col>

        {/* 地域分布 */}
        <Col xs={24}>
          <Card title={<span style={{ color: textPrimary }}>访客地域分布 Top 5</span>}>
            {reportData?.geoDistribution && reportData.geoDistribution.length > 0 ? (
              <Row gutter={[8, 8]}>
                {reportData.geoDistribution.map((item, idx) => {
                  const maxVisitors = Math.max(...reportData.geoDistribution.map(g => g.visitors))
                  const pct = Math.round((item.visitors / maxVisitors) * 100)
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={idx}>
                      <Card size="small" bodyStyle={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ color: textPrimary, fontWeight: 500 }}>{item.country}</span>
                          <span style={{ color: '#06b6d4', fontWeight: 600 }}>{item.visitors} 人</span>
                        </div>
                        <Progress
                          percent={pct}
                          size="small"
                          strokeColor="#06b6d4"
                          trailColor={isDark ? '#374151' : '#e5e7eb'}
                          showInfo={false}
                        />
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            ) : (
              <Empty description="暂无地域数据" />
            )}
          </Card>
        </Col>
      </Row>
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
