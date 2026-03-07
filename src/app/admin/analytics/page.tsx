/**
 * 数据分析页面
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Card, Row, Col, Tabs, Table, Tag, Space, Select, Spin, Statistic, Empty } from 'antd'
import { Line, Bar } from '@ant-design/charts'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// 从 URL 参数获取当前租户
function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || ''
}

interface TrafficRow { date: string; visitors: number; pageViews: number }
interface SourceRow { source: string; count: number }
interface PageRow { page: string; pv: number; uv: number }
interface Funnel { visitors: number; toolUsers: number; inquiryUsers: number; converted: number }
interface ToolStat { tool: string; total: number; completed: number; abandoned: number; avgTime: string; completionRate: number }

function AnalyticsPageWithSuspense() {
  const TENANT = useTenantFromURL()
  const [days, setDays] = useState(7)
  const [traffic, setTraffic] = useState<TrafficRow[]>([])
  const [sources, setSources] = useState<SourceRow[]>([])
  const [topPages, setTopPages] = useState<PageRow[]>([])
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [toolStats, setToolStats] = useState<ToolStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!TENANT) return
    const load = async () => {
      setLoading(true)
      try {
        const [trafficRes, analyticsRes, toolsRes] = await Promise.all([
          fetch(`/api/admin/traffic?tenant=${TENANT}&days=${days}`),
          fetch(`/api/admin/analytics?tenant=${TENANT}`),
          fetch(`/api/admin/tools?tenant=${TENANT}`),
        ])
        const [trafficData, analyticsData, toolsData] = await Promise.all([
          trafficRes.json(), analyticsRes.json(), toolsRes.json(),
        ])
        setTraffic(trafficData)
        setSources(analyticsData.sourceStats ?? [])
        setTopPages(analyticsData.topPages ?? [])
        setFunnel(analyticsData.funnel ?? null)
        setToolStats(toolsData.toolStats ?? [])
      } catch (e) {
        console.error('Analytics load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [TENANT, days])

  const funnelData = funnel
    ? [
        { stage: '总访客', count: funnel.visitors },
        { stage: '使用工具', count: funnel.toolUsers },
        { stage: '提交询盘', count: funnel.inquiryUsers },
        { stage: '成交转化', count: funnel.converted },
      ]
    : []

  const trafficLineConfig = {
    data: traffic.flatMap(d => [
      { date: d.date, value: d.pageViews, type: '页面浏览' },
      { date: d.date, value: d.visitors, type: '独立访客' },
    ]),
    xField: 'date',
    yField: 'value',
    colorField: 'type',
    smooth: true,
    height: 300,
    xAxis: { label: { formatter: (v: string) => dayjs(v).format('MM-DD') } },
  }

  const sourceBarConfig = {
    data: sources,
    xField: 'source',
    yField: 'count',
    color: '#52c41a',
    height: 300,
    label: { position: 'top' as const },
  }

  const funnelBarConfig = {
    data: funnelData,
    xField: 'stage',
    yField: 'count',
    color: '#722ed1',
    height: 300,
    label: { position: 'top' as const },
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" tip="加载分析数据..." /></div>
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>数据分析</h2>
        <Space>
          <Select
            value={days}
            onChange={setDays}
            style={{ width: 110 }}
            options={[
              { value: 7, label: '最近7天' },
              { value: 30, label: '最近30天' },
              { value: 90, label: '最近90天' },
            ]}
          />
        </Space>
      </div>

      <Tabs
        items={[
          {
            key: 'traffic',
            label: '流量分析',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title={`流量趋势（最近${days}天）`}>
                    {traffic.length > 0
                      ? <Line {...trafficLineConfig} />
                      : <Empty description="暂无流量数据，请确认追踪 SDK 已部署到网站" />}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="流量来源分布">
                    {sources.length > 0
                      ? <Bar {...sourceBarConfig} />
                      : <Empty description="暂无来源数据" />}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="热门页面 TOP10">
                    {topPages.length > 0 ? (
                      <Table
                        dataSource={topPages}
                        rowKey="page"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: '页面路径', dataIndex: 'page', key: 'page', ellipsis: true },
                          { title: '浏览量', dataIndex: 'pv', key: 'pv', sorter: (a: PageRow, b: PageRow) => a.pv - b.pv },
                          { title: '独立访客', dataIndex: 'uv', key: 'uv' },
                        ]}
                      />
                    ) : (
                      <Empty description="暂无页面数据" />
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'funnel',
            label: '转化漏斗',
            children: (
              <Row gutter={[16, 16]}>
                {funnel && (
                  <Col xs={24}>
                    <Row gutter={16}>
                      <Col xs={12} sm={6}>
                        <Card><Statistic title="总访客" value={funnel.visitors} /></Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card><Statistic title="使用工具" value={funnel.toolUsers} suffix={funnel.visitors > 0 ? `(${((funnel.toolUsers/funnel.visitors)*100).toFixed(1)}%)` : ''} /></Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card><Statistic title="提交询盘" value={funnel.inquiryUsers} suffix={funnel.visitors > 0 ? `(${((funnel.inquiryUsers/funnel.visitors)*100).toFixed(1)}%)` : ''} /></Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card><Statistic title="成交转化" value={funnel.converted} suffix={funnel.visitors > 0 ? `(${((funnel.converted/funnel.visitors)*100).toFixed(1)}%)` : ''} /></Card>
                      </Col>
                    </Row>
                  </Col>
                )}
                <Col xs={24}>
                  <Card title="转化漏斗图">
                    {funnelData.length > 0 && funnelData[0].count > 0
                      ? <Bar {...funnelBarConfig} />
                      : <Empty description="暂无转化数据" />}
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card title="各阶段转化率">
                    <Table
                      dataSource={funnelData}
                      rowKey="stage"
                      pagination={false}
                      columns={[
                        { title: '阶段', dataIndex: 'stage', key: 'stage' },
                        { title: '用户数', dataIndex: 'count', key: 'count' },
                        {
                          title: '转化率',
                          key: 'rate',
                          render: (_: unknown, r: { stage: string; count: number }, index: number) => {
                            if (index === 0) return '100%'
                            const base = funnelData[0].count
                            return base > 0 ? `${((r.count / base) * 100).toFixed(1)}%` : '-'
                          },
                        },
                        {
                          title: '环比流失',
                          key: 'loss',
                          render: (_: unknown, r: { stage: string; count: number }, index: number) => {
                            if (index === 0) return '-'
                            const prev = funnelData[index - 1].count
                            if (prev <= 0) return '-'
                            const lost = ((prev - r.count) / prev * 100).toFixed(1)
                            return <Tag color="red">-{lost}%</Tag>
                          },
                        },
                      ]}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'tools',
            label: '工具分析',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title="工具使用详情">
                    {toolStats.length > 0 ? (
                      <Table
                        dataSource={toolStats}
                        rowKey="tool"
                        pagination={false}
                        columns={[
                          { title: '工具名称', dataIndex: 'tool', key: 'tool', render: (t: string) => <Tag color="blue">{t}</Tag> },
                          { title: '总使用次数', dataIndex: 'total', key: 'total' },
                          {
                            title: '完成',
                            dataIndex: 'completed',
                            key: 'completed',
                            render: (v: number, r: ToolStat) => (
                              <span style={{ color: '#52c41a' }}>{v} ({r.total > 0 ? Math.round(v / r.total * 100) : 0}%)</span>
                            ),
                          },
                          {
                            title: '放弃',
                            dataIndex: 'abandoned',
                            key: 'abandoned',
                            render: (v: number, r: ToolStat) => (
                              <span style={{ color: '#ff4d4f' }}>{v} ({r.total > 0 ? Math.round(v / r.total * 100) : 0}%)</span>
                            ),
                          },
                          { title: '平均用时', dataIndex: 'avgTime', key: 'avgTime' },
                          {
                            title: '完成率',
                            dataIndex: 'completionRate',
                            key: 'completionRate',
                            render: (v: number) => (
                              <Tag color={v >= 70 ? 'green' : v >= 40 ? 'orange' : 'red'}>{v}%</Tag>
                            ),
                          },
                        ]}
                      />
                    ) : (
                      <Empty description="暂无工具使用数据，等待用户与工具交互后自动记录" />
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  )
}

// 使用 Suspense 包裹整个页面
export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 50, textAlign: 'center' }}><Spin tip="加载中..." /></div>}>
      <AnalyticsPageWithSuspense />
    </Suspense>
  )
}
