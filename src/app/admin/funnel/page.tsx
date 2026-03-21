/**
 * 漏斗分析页面 - 增强版
 * 使用增强API获取完整转化路径分析：趋势、页面漏斗、工具漏斗、来源归因
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Row, Col, Card, Table, Tag, Select, Spin, Progress, Empty, Tabs, Button, Space } from 'antd'
import { ReloadOutlined, DownloadOutlined } from '@ant-design/icons'
import { useTheme } from '@/components/AdminLayout'

function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || 'zxqconsulting'
}

interface FunnelStage { stage: string; count: number; rate: number }
interface ToolFunnel { tool: string; total: number; started: number; completed: number; abandoned: number; completionRate: number; avgDuration: number }
interface SourceFunnel { source: string; visitors: number; toolUsers: number; inquirers: number; toolConversion: number; inquiryConversion: number }
interface PageFunnel { page: string; visitors: number; views: number; converted: number; conversionRate: number }
interface TrendRow { date: string; visitors: number; pageViewers: number; toolUsers: number; completions: number; inquirers: number; conversionRate: number }

function FunnelAnalysisWithSuspense() {
  const TENANT = useTenantFromURL()
  const { isDark, textPrimary, textSecondary, textMuted } = useTheme()
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [activeTab, setActiveTab] = useState('funnel')

  // 基础漏斗数据
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})

  // 趋势数据
  const [trendData, setTrendData] = useState<TrendRow[]>([])

  // 页面漏斗
  const [pageFunnel, setPageFunnel] = useState<PageFunnel[]>([])

  // 工具漏斗
  const [toolFunnel, setToolFunnel] = useState<ToolFunnel[]>([])

  // 来源漏斗
  const [sourceFunnel, setSourceFunnel] = useState<SourceFunnel[]>([])

  useEffect(() => {
    if (!TENANT) return
    fetchEnhancedData()
  }, [TENANT, days])

  async function fetchEnhancedData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/funnel-enhanced?tenant=${TENANT}&days=${days}`)
      const data = await res.json()

      if (data.funnel) setFunnelData(data.funnel)
      if (data.summary) setSummary(data.summary)
      if (data.trend) setTrendData(data.trend)
      if (data.pageFunnel) setPageFunnel(data.pageFunnel)
      if (data.toolFunnel) setToolFunnel(data.toolFunnel)
      if (data.sourceFunnel) setSourceFunnel(data.sourceFunnel)
    } catch (error) {
      console.error('Funnel enhanced fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 漏斗阶段颜色
  const stageColors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444']

  const funnelColumns = [
    {
      title: '阶段',
      key: 'stage',
      render: (_: unknown, r: FunnelStage, index: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: stageColors[index] || '#8b5cf6',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
          }}>
            {index + 1}
          </span>
          <span style={{ color: textPrimary, fontWeight: 500 }}>{r.stage}</span>
        </div>
      ),
    },
    {
      title: '用户数',
      dataIndex: 'count',
      key: 'count',
      render: (v: number) => (
        <span style={{ color: '#10b981', fontWeight: 700, fontSize: 16 }}>
          {v.toLocaleString()}
        </span>
      ),
    },
    {
      title: '本阶段转化率',
      dataIndex: 'rate',
      key: 'rate',
      render: (v: number) => (
        <div style={{ width: 140 }}>
          <Progress
            percent={v}
            size="small"
            strokeColor={v >= 50 ? '#10b981' : v >= 20 ? '#f59e0b' : '#ef4444'}
            trailColor={isDark ? '#374151' : '#e5e7eb'}
          />
          <span style={{ color: textMuted, fontSize: 12 }}>{v}%</span>
        </div>
      ),
    },
  ]

  const toolColumns = [
    {
      title: '工具名称',
      dataIndex: 'tool',
      key: 'tool',
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '总使用',
      dataIndex: 'total',
      key: 'total',
      sorter: (a: ToolFunnel, b: ToolFunnel) => a.total - b.total,
      render: (v: number) => <span style={{ color: textSecondary }}>{v}</span>,
    },
    {
      title: '开始',
      dataIndex: 'started',
      key: 'started',
      render: (v: number) => <span style={{ color: '#06b6d4' }}>{v}</span>,
    },
    {
      title: '完成',
      dataIndex: 'completed',
      key: 'completed',
      render: (v: number) => <Tag color="green">{v}</Tag>,
    },
    {
      title: '放弃',
      dataIndex: 'abandoned',
      key: 'abandoned',
      render: (v: number) => <Tag color="red">{v}</Tag>,
    },
    {
      title: '完成率',
      dataIndex: 'completionRate',
      key: 'completionRate',
      sorter: (a: ToolFunnel, b: ToolFunnel) => a.completionRate - b.completionRate,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={v >= 70 ? '#10b981' : v >= 40 ? '#f59e0b' : '#ef4444'}
          trailColor={isDark ? '#374151' : '#e5e7eb'}
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: '平均用时',
      dataIndex: 'avgDuration',
      key: 'avgDuration',
      render: (v: number) => (
        <span style={{ color: textMuted }}>
          {v > 0 ? (v < 60 ? `${v}秒` : `${Math.floor(v / 60)}分${v % 60}秒`) : '-'}
        </span>
      ),
    },
  ]

  const sourceColumns = [
    {
      title: '流量来源',
      dataIndex: 'source',
      key: 'source',
      render: (v: string) => <Tag color="purple">{v || '直接访问'}</Tag>,
    },
    {
      title: '访客数',
      dataIndex: 'visitors',
      key: 'visitors',
      sorter: (a: SourceFunnel, b: SourceFunnel) => a.visitors - b.visitors,
      render: (v: number) => <span style={{ color: '#06b6d4', fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '工具使用',
      dataIndex: 'toolUsers',
      key: 'toolUsers',
      render: (v: number) => <span style={{ color: '#8b5cf6' }}>{v}</span>,
    },
    {
      title: '提交询盘',
      dataIndex: 'inquirers',
      key: 'inquirers',
      render: (v: number) => <Tag color="green">{v}</Tag>,
    },
    {
      title: '工具转化率',
      dataIndex: 'toolConversion',
      key: 'toolConversion',
      sorter: (a: SourceFunnel, b: SourceFunnel) => a.toolConversion - b.toolConversion,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={v >= 20 ? '#10b981' : v >= 10 ? '#f59e0b' : '#6b7280'}
          trailColor={isDark ? '#374151' : '#e5e7eb'}
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: '询盘转化率',
      dataIndex: 'inquiryConversion',
      key: 'inquiryConversion',
      render: (v: number) => (
        <span style={{ color: v > 0 ? '#10b981' : textMuted, fontWeight: 500 }}>
          {v > 0 ? `${v}%` : '-'}
        </span>
      ),
    },
  ]

  const pageColumns = [
    {
      title: '页面',
      dataIndex: 'page',
      key: 'page',
      ellipsis: true,
      render: (v: string) => <span style={{ color: textSecondary, fontSize: 12 }}>{v}</span>,
    },
    {
      title: '访客',
      dataIndex: 'visitors',
      key: 'visitors',
      sorter: (a: PageFunnel, b: PageFunnel) => a.visitors - b.visitors,
      render: (v: number) => <span style={{ color: '#06b6d4' }}>{v}</span>,
    },
    {
      title: '浏览次数',
      dataIndex: 'views',
      key: 'views',
      render: (v: number) => <span style={{ color: textMuted }}>{v}</span>,
    },
    {
      title: '转化人数',
      dataIndex: 'converted',
      key: 'converted',
      render: (v: number) => <Tag color="green">{v}</Tag>,
    },
    {
      title: '转化率',
      dataIndex: 'conversionRate',
      key: 'conversionRate',
      sorter: (a: PageFunnel, b: PageFunnel) => a.conversionRate - b.conversionRate,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={v >= 30 ? '#10b981' : v >= 10 ? '#f59e0b' : '#ef4444'}
          trailColor={isDark ? '#374151' : '#e5e7eb'}
          style={{ width: 80 }}
        />
      ),
    },
  ]

  const tabItems = [
    {
      key: 'funnel',
      label: '基础漏斗',
      children: (
        <Card title={<span style={{ color: textPrimary }}>用户转化漏斗</span>}>
          {funnelData.length > 0 ? (
            <Table
              dataSource={funnelData}
              columns={funnelColumns}
              pagination={false}
              rowKey="stage"
              style={{ marginBottom: 24 }}
            />
          ) : (
            <Empty description="暂无漏斗数据" />
          )}

          {/* 汇总指标 */}
          {summary && Object.keys(summary).length > 0 && (
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={4}>
                <div style={{ textAlign: 'center', padding: 16, background: isDark ? '#1f2937' : '#f9fafb', borderRadius: 8 }}>
                  <div style={{ color: textMuted, fontSize: 12 }}>总访客</div>
                  <div style={{ color: '#06b6d4', fontSize: 24, fontWeight: 700 }}>{summary.totalVisitors?.toLocaleString() ?? 0}</div>
                </div>
              </Col>
              <Col xs={12} sm={4}>
                <div style={{ textAlign: 'center', padding: 16, background: isDark ? '#1f2937' : '#f9fafb', borderRadius: 8 }}>
                  <div style={{ color: textMuted, fontSize: 12 }}>活跃访客</div>
                  <div style={{ color: '#8b5cf6', fontSize: 24, fontWeight: 700 }}>{summary.totalEngaged?.toLocaleString() ?? 0}</div>
                </div>
              </Col>
              <Col xs={12} sm={4}>
                <div style={{ textAlign: 'center', padding: 16, background: isDark ? '#1f2937' : '#f9fafb', borderRadius: 8 }}>
                  <div style={{ color: textMuted, fontSize: 12 }}>工具使用</div>
                  <div style={{ color: '#f59e0b', fontSize: 24, fontWeight: 700 }}>{summary.totalToolUsers?.toLocaleString() ?? 0}</div>
                </div>
              </Col>
              <Col xs={12} sm={4}>
                <div style={{ textAlign: 'center', padding: 16, background: isDark ? '#1f2937' : '#f9fafb', borderRadius: 8 }}>
                  <div style={{ color: textMuted, fontSize: 12 }}>完成分析</div>
                  <div style={{ color: '#10b981', fontSize: 24, fontWeight: 700 }}>{summary.totalCompletions?.toLocaleString() ?? 0}</div>
                </div>
              </Col>
              <Col xs={12} sm={4}>
                <div style={{ textAlign: 'center', padding: 16, background: isDark ? '#1f2937' : '#f9fafb', borderRadius: 8 }}>
                  <div style={{ color: textMuted, fontSize: 12 }}>提交询盘</div>
                  <div style={{ color: '#ef4444', fontSize: 24, fontWeight: 700 }}>{summary.totalInquiries?.toLocaleString() ?? 0}</div>
                </div>
              </Col>
              <Col xs={12} sm={4}>
                <div style={{ textAlign: 'center', padding: 16, background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: 8 }}>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>总转化率</div>
                  <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{summary.overallConversionRate ?? 0}%</div>
                </div>
              </Col>
            </Row>
          )}
        </Card>
      ),
    },
    {
      key: 'tool',
      label: `工具转化 (${toolFunnel.length})`,
      children: (
        <Card title={<span style={{ color: textPrimary }}>工具转化分析</span>}>
          {toolFunnel.length > 0 ? (
            <Table
              dataSource={toolFunnel}
              columns={toolColumns}
              pagination={{ pageSize: 10 }}
              rowKey="tool"
              size="small"
            />
          ) : (
            <Empty description="暂无工具使用数据" />
          )}
        </Card>
      ),
    },
    {
      key: 'source',
      label: `来源归因 (${sourceFunnel.length})`,
      children: (
        <Card title={<span style={{ color: textPrimary }}>流量来源转化分析</span>}>
          {sourceFunnel.length > 0 ? (
            <Table
              dataSource={sourceFunnel}
              columns={sourceColumns}
              pagination={{ pageSize: 10 }}
              rowKey="source"
              size="small"
            />
          ) : (
            <Empty description="暂无来源数据" />
          )}
        </Card>
      ),
    },
    {
      key: 'page',
      label: `页面转化 (${pageFunnel.length})`,
      children: (
        <Card title={<span style={{ color: textPrimary }}>页面转化分析</span>}>
          {pageFunnel.length > 0 ? (
            <Table
              dataSource={pageFunnel}
              columns={pageColumns}
              pagination={{ pageSize: 10 }}
              rowKey="page"
              size="small"
            />
          ) : (
            <Empty description="暂无页面数据" />
          )}
        </Card>
      ),
    },
    {
      key: 'trend',
      label: `转化趋势 (${trendData.length})`,
      children: (
        <Card title={<span style={{ color: textPrimary }}>转化率趋势</span>}>
          {trendData.length > 0 ? (
            <Table
              dataSource={trendData}
              rowKey="date"
              pagination={{ pageSize: 14 }}
              size="small"
              columns={[
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
                  render: (v: number) => <span style={{ color: '#06b6d4' }}>{v}</span>,
                },
                {
                  title: <span style={{ color: '#8b5cf6' }}>工具用户</span>,
                  dataIndex: 'toolUsers',
                  key: 'toolUsers',
                  render: (v: number) => <span style={{ color: '#8b5cf6' }}>{v}</span>,
                },
                {
                  title: <span style={{ color: '#10b981' }}>完成数</span>,
                  dataIndex: 'completions',
                  key: 'completions',
                  render: (v: number) => <span style={{ color: '#10b981' }}>{v}</span>,
                },
                {
                  title: <span style={{ color: '#ef4444' }}>询盘数</span>,
                  dataIndex: 'inquirers',
                  key: 'inquirers',
                  render: (v: number) => <Tag color="green">{v}</Tag>,
                },
                {
                  title: '转化率',
                  dataIndex: 'conversionRate',
                  key: 'conversionRate',
                  sorter: (a: TrendRow, b: TrendRow) => a.conversionRate - b.conversionRate,
                  render: (v: number) => (
                    <Progress
                      percent={v}
                      size="small"
                      strokeColor={v >= 5 ? '#10b981' : v >= 2 ? '#f59e0b' : '#ef4444'}
                      trailColor={isDark ? '#374151' : '#e5e7eb'}
                      style={{ width: 80 }}
                    />
                  ),
                },
              ]}
            />
          ) : (
            <Empty description="暂无趋势数据" />
          )}
        </Card>
      ),
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" tip="加载增强漏斗数据..." />
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>转化漏斗分析</h2>
        <Space>
          <Select
            value={days}
            onChange={(v) => setDays(v)}
            style={{ width: 140 }}
            options={[
              { value: 7, label: '最近 7 天' },
              { value: 30, label: '最近 30 天' },
              { value: 90, label: '最近 90 天' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchEnhancedData}>刷新</Button>
          <Button icon={<DownloadOutlined />} onClick={() => window.open(`/api/admin/export?tenant=${TENANT}&type=funnel`, '_blank')}>
            导出
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  )
}

export default function FunnelPage() {
  return (
    <Suspense fallback={<div style={{ padding: 50, textAlign: 'center' }}><Spin tip="加载中..." /></div>}>
      <FunnelAnalysisWithSuspense />
    </Suspense>
  )
}
