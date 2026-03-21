/**
 * 数据分析页面
 * 多彩渐变设计风格
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Card, Row, Col, Tabs, Table, Tag, Space, Select, Spin, Statistic, Empty } from 'antd'
import { Line, Bar } from '@ant-design/charts'
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

interface TrafficRow { date: string; visitors: number; pageViews: number }
interface SourceRow { source: string; count: number }
interface PageRow { page: string; pv: number; uv: number }
interface Funnel { visitors: number; toolUsers: number; inquiryUsers: number; converted: number }
interface ToolStat { tool: string; total: number; completed: number; abandoned: number; avgTime: string; completionRate: number }
interface AudienceData {
  summary: { totalVisitors: number; totalSessions: number; totalEvents: number }
  devices: { type: string; visitors: number; pageViews: number }[]
  browsers: { name: string; visitors: number; pageViews: number }[]
  operatingSystems: { name: string; visitors: number; pageViews: number }[]
  countries: { name: string; visitors: number; pageViews: number }[]
  cities: { name: string; country: string; visitors: number; pageViews: number }[]
  trafficSources: { source: string; visitors: number; pageViews: number }[]
  languages: { name: string; visitors: number; pageViews: number }[]
}

// 多彩渐变卡片配置
const ANALYTICS_CARDS = [
  { key: 'visitors', label: '总访客', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', icon: '👥' },
  { key: 'sessions', label: '总会话', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', icon: '🔗' },
  { key: 'events', label: '总事件', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: '📊' },
]

function AnalyticsPageWithSuspense() {
  const TENANT = useTenantFromURL()
  const { isDark, chartColors, textPrimary, textSecondary, textMuted, successColor, errorColor } = useTheme()
  const [days, setDays] = useState(7)
  const [traffic, setTraffic] = useState<TrafficRow[]>([])
  const [sources, setSources] = useState<SourceRow[]>([])
  const [topPages, setTopPages] = useState<PageRow[]>([])
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [toolStats, setToolStats] = useState<ToolStat[]>([])
  const [audience, setAudience] = useState<AudienceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!TENANT) return
    const load = async () => {
      setLoading(true)
      try {
        const [trafficRes, analyticsRes, toolsRes, audienceRes] = await Promise.all([
          fetch(`/api/admin/traffic?tenant=${TENANT}&days=${days}`),
          fetch(`/api/admin/analytics?tenant=${TENANT}`),
          fetch(`/api/admin/tools?tenant=${TENANT}`),
          fetch(`/api/admin/audience?tenant=${TENANT}&days=${days}`),
        ])
        const [trafficData, analyticsData, toolsData, audienceData] = await Promise.all([
          trafficRes.json(), analyticsRes.json(), toolsRes.json(), audienceRes.json(),
        ])
        setTraffic(trafficData)
        setSources(analyticsData.sourceStats ?? [])
        setTopPages(analyticsData.topPages ?? [])
        setFunnel(analyticsData.funnel ?? null)
        setToolStats(toolsData.toolStats ?? [])
        setAudience(audienceData)
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
    xAxis: { label: { formatter: (v: string) => dayjs(v).format('MM-DD'), style: { fill: textSecondary } } },
    yAxis: { label: { style: { fill: textSecondary } } },
    legend: { itemName: { style: { fill: textSecondary } } },
    theme: isDark ? 'classicDark' : 'classic',
    color: ['#8b5cf6', '#06b6d4'],
  }

  const sourceBarConfig = {
    data: sources,
    xField: 'source',
    yField: 'count',
    color: '#8b5cf6',
    height: 300,
    label: { position: 'top' as const, style: { fill: textSecondary } },
    xAxis: { label: { style: { fill: textSecondary } } },
    yAxis: { label: { style: { fill: textSecondary } } },
    theme: isDark ? 'classicDark' : 'classic',
  }

  const funnelBarConfig = {
    data: funnelData,
    xField: 'stage',
    yField: 'count',
    color: '#10b981',
    height: 300,
    label: { position: 'top' as const, style: { fill: textSecondary } },
    xAxis: { label: { style: { fill: textSecondary } } },
    yAxis: { label: { style: { fill: textSecondary } } },
    theme: isDark ? 'classicDark' : 'classic',
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" tip="加载分析数据..." /></div>
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>数据分析</h2>
        <Select
          value={days}
          onChange={setDays}
          style={{ width: 140 }}
          options={[
            { value: 7, label: '最近 7 天' },
            { value: 30, label: '最近 30 天' },
            { value: 90, label: '最近 90 天' },
          ]}
        />
      </div>

      {/* 多彩指标卡片 */}
      {audience && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {ANALYTICS_CARDS.map((card) => (
            <Col xs={12} sm={8} key={card.key}>
              <Card
                hoverable
                style={{ background: card.gradient, border: 'none' }}
                bodyStyle={{ padding: '16px', textAlign: 'center' }}
              >
                <div style={{ color: '#fff' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
                  <div style={{ opacity: 0.9, fontSize: 12, marginBottom: 4 }}>{card.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>
                    {card.key === 'visitors' ? audience.summary.totalVisitors :
                     card.key === 'sessions' ? audience.summary.totalSessions :
                     audience.summary.totalEvents}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Tabs
        items={[
          {
            key: 'traffic',
            label: '流量分析',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title={<span style={{ color: textPrimary }}>流量趋势</span>}>
                    {traffic.length > 0
                      ? <Line {...trafficLineConfig} />
                      : <Empty description="暂无流量数据" />}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title={<span style={{ color: textPrimary }}>流量来源</span>}>
                    {sources.length > 0
                      ? <Bar {...sourceBarConfig} />
                      : <Empty description="暂无来源数据" />}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title={<span style={{ color: textPrimary }}>热门页面</span>}>
                    {topPages.length > 0 ? (
                      <Table
                        dataSource={topPages}
                        rowKey="page"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: '页面', dataIndex: 'page', key: 'page', ellipsis: true, render: (v: string) => <span style={{ color: textSecondary }}>{v}</span> },
                          { title: <><span style={{ color: '#8b5cf6' }}>PV</span></>, dataIndex: 'pv', key: 'pv', render: (v: number) => <span style={{ color: '#8b5cf6', fontWeight: 500 }}>{v}</span> },
                          { title: <><span style={{ color: '#06b6d4' }}>UV</span></>, dataIndex: 'uv', key: 'uv', render: (v: number) => <span style={{ color: '#06b6d4', fontWeight: 500 }}>{v}</span> },
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
                        <Card hoverable style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none' }} bodyStyle={{ padding: '16px', textAlign: 'center' }}>
                          <div style={{ color: '#fff' }}>
                            <div style={{ opacity: 0.9, fontSize: 12 }}>总访客</div>
                            <div style={{ fontSize: 24, fontWeight: 700 }}>{funnel.visitors}</div>
                          </div>
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card hoverable style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: 'none' }} bodyStyle={{ padding: '16px', textAlign: 'center' }}>
                          <div style={{ color: '#fff' }}>
                            <div style={{ opacity: 0.9, fontSize: 12 }}>使用工具</div>
                            <div style={{ fontSize: 24, fontWeight: 700 }}>{funnel.toolUsers}</div>
                            <div style={{ opacity: 0.8, fontSize: 11 }}>{funnel.visitors > 0 ? ((funnel.toolUsers/funnel.visitors)*100).toFixed(1) : 0}%</div>
                          </div>
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card hoverable style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }} bodyStyle={{ padding: '16px', textAlign: 'center' }}>
                          <div style={{ color: '#fff' }}>
                            <div style={{ opacity: 0.9, fontSize: 12 }}>提交询盘</div>
                            <div style={{ fontSize: 24, fontWeight: 700 }}>{funnel.inquiryUsers}</div>
                            <div style={{ opacity: 0.8, fontSize: 11 }}>{funnel.visitors > 0 ? ((funnel.inquiryUsers/funnel.visitors)*100).toFixed(1) : 0}%</div>
                          </div>
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card hoverable style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }} bodyStyle={{ padding: '16px', textAlign: 'center' }}>
                          <div style={{ color: '#fff' }}>
                            <div style={{ opacity: 0.9, fontSize: 12 }}>成交转化</div>
                            <div style={{ fontSize: 24, fontWeight: 700 }}>{funnel.converted}</div>
                            <div style={{ opacity: 0.8, fontSize: 11 }}>{funnel.visitors > 0 ? ((funnel.converted/funnel.visitors)*100).toFixed(1) : 0}%</div>
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </Col>
                )}
                <Col xs={24}>
                  <Card title={<span style={{ color: textPrimary }}>转化漏斗图</span>}>
                    {funnelData.length > 0 && funnelData[0].count > 0
                      ? <Bar {...funnelBarConfig} />
                      : <Empty description="暂无转化数据" />}
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card title={<span style={{ color: textPrimary }}>各阶段转化率</span>}>
                    <Table
                      dataSource={funnelData}
                      rowKey="stage"
                      pagination={false}
                      columns={[
                        { title: '阶段', dataIndex: 'stage', key: 'stage', render: (v: string) => <Tag color="blue">{v}</Tag> },
                        { title: '用户数', dataIndex: 'count', key: 'count', render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span> },
                        {
                          title: '转化率',
                          key: 'rate',
                          render: (_: unknown, r: { stage: string; count: number }, index: number) => {
                            if (index === 0) return <Tag color="blue">100%</Tag>
                            const base = funnelData[0].count
                            return base > 0 ? <Tag color="green">{((r.count / base) * 100).toFixed(1)}%</Tag> : '-'
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
                  <Card title={<span style={{ color: textPrimary }}>工具使用详情</span>}>
                    {toolStats.length > 0 ? (
                      <Table
                        dataSource={toolStats}
                        rowKey="tool"
                        pagination={false}
                        columns={[
                          { title: '工具', dataIndex: 'tool', key: 'tool', render: (t: string) => <Tag color="purple">{t}</Tag> },
                          { title: '总次数', dataIndex: 'total', key: 'total', render: (v: number) => <span style={{ color: '#8b5cf6', fontWeight: 500 }}>{v}</span> },
                          { title: '完成', dataIndex: 'completed', key: 'completed', render: (v: number, r: ToolStat) => <span style={{ color: successColor }}>{v} ({r.total > 0 ? Math.round(v / r.total * 100) : 0}%)</span> },
                          { title: '放弃', dataIndex: 'abandoned', key: 'abandoned', render: (v: number, r: ToolStat) => <span style={{ color: errorColor }}>{v} ({r.total > 0 ? Math.round(v / r.total * 100) : 0}%)</span> },
                          { title: '平均用时', dataIndex: 'avgTime', key: 'avgTime' },
                          { title: '完成率', dataIndex: 'completionRate', key: 'completionRate', render: (v: number) => <Tag color={v >= 70 ? 'green' : v >= 40 ? 'orange' : 'red'}>{v}%</Tag> },
                        ]}
                      />
                    ) : (
                      <Empty description="暂无工具使用数据" />
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'audience',
            label: '受众分析',
            children: audience ? (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title={<span style={{ color: textPrimary }}>设备类型</span>}>
                    {audience.devices.length > 0 ? (
                      <Table
                        dataSource={audience.devices}
                        rowKey="type"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: '设备', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color="cyan">{v}</Tag> },
                          { title: '访客', dataIndex: 'visitors', key: 'visitors', render: (v: number) => <span style={{ color: '#06b6d4' }}>{v}</span> },
                          { title: '浏览量', dataIndex: 'pageViews', key: 'pageViews', render: (v: number) => <span style={{ color: '#8b5cf6' }}>{v}</span> },
                        ]}
                      />
                    ) : <Empty />}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title={<span style={{ color: textPrimary }}>浏览器</span>}>
                    {audience.browsers.length > 0 ? (
                      <Table
                        dataSource={audience.browsers}
                        rowKey="name"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: '浏览器', dataIndex: 'name', key: 'name' },
                          { title: '访客', dataIndex: 'visitors', key: 'visitors', render: (v: number) => <span style={{ color: '#06b6d4' }}>{v}</span> },
                          { title: '浏览量', dataIndex: 'pageViews', key: 'pageViews', render: (v: number) => <span style={{ color: '#8b5cf6' }}>{v}</span> },
                        ]}
                      />
                    ) : <Empty />}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title={<span style={{ color: textPrimary }}>操作系统</span>}>
                    {audience.operatingSystems.length > 0 ? (
                      <Table
                        dataSource={audience.operatingSystems}
                        rowKey="name"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: '系统', dataIndex: 'name', key: 'name' },
                          { title: '访客', dataIndex: 'visitors', key: 'visitors', render: (v: number) => <span style={{ color: '#06b6d4' }}>{v}</span> },
                          { title: '浏览量', dataIndex: 'pageViews', key: 'pageViews', render: (v: number) => <span style={{ color: '#8b5cf6' }}>{v}</span> },
                        ]}
                      />
                    ) : <Empty />}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title={<span style={{ color: textPrimary }}>流量来源</span>}>
                    {audience.trafficSources.length > 0 ? (
                      <Table
                        dataSource={audience.trafficSources}
                        rowKey="source"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: '来源', dataIndex: 'source', key: 'source', render: (v: string) => <Tag color={v==='search'?'blue':v==='social'?'green':v==='direct'?'orange':'default'}>{v}</Tag> },
                          { title: '访客', dataIndex: 'visitors', key: 'visitors', render: (v: number) => <span style={{ color: '#06b6d4' }}>{v}</span> },
                          { title: '浏览量', dataIndex: 'pageViews', key: 'pageViews', render: (v: number) => <span style={{ color: '#8b5cf6' }}>{v}</span> },
                        ]}
                      />
                    ) : <Empty />}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title={<span style={{ color: textPrimary }}>国家/地区</span>}>
                    {audience.countries.length > 0 ? (
                      <Table
                        dataSource={audience.countries}
                        rowKey="name"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: '国家', dataIndex: 'name', key: 'name' },
                          { title: '访客', dataIndex: 'visitors', key: 'visitors', render: (v: number) => <span style={{ color: '#06b6d4' }}>{v}</span> },
                          { title: '浏览量', dataIndex: 'pageViews', key: 'pageViews', render: (v: number) => <span style={{ color: '#8b5cf6' }}>{v}</span> },
                        ]}
                      />
                    ) : <Empty />}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title={<span style={{ color: textPrimary }}>城市 TOP15</span>}>
                    {audience.cities.length > 0 ? (
                      <Table
                        dataSource={audience.cities}
                        rowKey="name"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: '城市', dataIndex: 'name', key: 'name' },
                          { title: '国家', dataIndex: 'country', key: 'country' },
                          { title: '访客', dataIndex: 'visitors', key: 'visitors', render: (v: number) => <span style={{ color: '#06b6d4' }}>{v}</span> },
                          { title: '浏览量', dataIndex: 'pageViews', key: 'pageViews', render: (v: number) => <span style={{ color: '#8b5cf6' }}>{v}</span> },
                        ]}
                      />
                    ) : <Empty />}
                  </Card>
                </Col>
              </Row>
            ) : (
              <Empty description="暂无受众数据" />
            ),
          },
        ]}
      />
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 50, textAlign: 'center' }}><Spin tip="加载中..." /></div>}>
      <AnalyticsPageWithSuspense />
    </Suspense>
  )
}
