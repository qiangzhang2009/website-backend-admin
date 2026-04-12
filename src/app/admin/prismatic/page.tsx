/**
 * Prismatic Analytics - 总览页
 * 展示 DAU/WAU/MAU、趋势图、Top Personas、AI 健康度
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Card, Row, Col, Statistic, Select, Spin, Empty, Progress, Tag } from 'antd'
import { Line, Pie } from '@ant-design/charts'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { useTheme } from '@/components/AdminLayout'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || 'prismatic'
}

interface OverviewMetrics {
  dau: number
  wau: number
  mau: number
  sessions: number
  avgSessionDuration: number
  totalEvents: number
  totalPersonas: number
  totalConversations: number
  avgConversationsPerVisitor: number
}

interface FunnelStep { name: string; count: number; rate: number }
interface DailyTrend { date: string; dau: number; sessions: number; pageviews: number; conversations: number }

function OverviewPageWithSuspense() {
  const TENANT = useTenantFromURL()
  const { isDark, chartColors, textPrimary, textSecondary, cardBg } = useTheme()
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<OverviewMetrics | null>(null)
  const [funnel, setFunnel] = useState<FunnelStep[]>([])
  const [trend, setTrend] = useState<DailyTrend[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/admin/prismatic/overview?tenant=${TENANT}&days=${days}`).then(r => r.json()),
    ]).then(([data]) => {
      setOverview(data.overview)
      setFunnel(data.funnel || [])
      setTrend(data.trend || [])
    }).catch(e => console.error(e))
      .finally(() => setLoading(false))
  }, [TENANT, days])

  const trendConfig = {
    data: trend.flatMap(d => [
      { date: dayjs(d.date).format('MM-DD'), value: d.dau, type: 'DAU' },
      { date: dayjs(d.date).format('MM-DD'), value: d.pageviews, type: '页面浏览' },
    ]),
    xField: 'date',
    yField: 'value',
    colorField: 'type',
    smooth: true,
    height: 280,
    xAxis: { label: { style: { fill: textSecondary } } },
    yAxis: { label: { style: { fill: textSecondary } } },
    legend: { itemName: { style: { fill: textSecondary } } },
    theme: isDark ? 'classicDark' : 'classic',
    color: [chartColors[0], chartColors[4]],
  }

  const funnelChartData = funnel.map((s, i) => ({
    stage: s.name,
    count: s.count,
    rate: s.rate,
    percentage: s.rate,
  }))

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" tip="加载 Prismatic 数据..." /></div>
  }

  if (!overview) {
    return <Empty description="暂无数据，请确保已集成追踪脚本" />
  }

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>
          Prismatic 总览
          <Tag color="purple" style={{ marginLeft: 12, fontSize: 12 }}>蒸馏人物分析</Tag>
        </h2>
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

      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }} bodyStyle={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ color: '#fff' }}>
              <div style={{ opacity: 0.85, fontSize: 12, marginBottom: 4 }}>今日活跃</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{overview.dau}</div>
              <div style={{ opacity: 0.7, fontSize: 11, marginTop: 4 }}>DAU</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)', border: 'none' }} bodyStyle={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ color: '#fff' }}>
              <div style={{ opacity: 0.85, fontSize: 12, marginBottom: 4 }}>本周活跃</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{overview.wau}</div>
              <div style={{ opacity: 0.7, fontSize: 11, marginTop: 4 }}>WAU</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)', border: 'none' }} bodyStyle={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ color: '#fff' }}>
              <div style={{ opacity: 0.85, fontSize: 12, marginBottom: 4 }}>本月活跃</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{overview.mau}</div>
              <div style={{ opacity: 0.7, fontSize: 11, marginTop: 4 }}>MAU</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)', border: 'none' }} bodyStyle={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ color: '#fff' }}>
              <div style={{ opacity: 0.85, fontSize: 12, marginBottom: 4 }}>总会话数</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{overview.sessions}</div>
              <div style={{ opacity: 0.7, fontSize: 11, marginTop: 4 }}>Sessions</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #fa709a, #fee140)', border: 'none' }} bodyStyle={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ color: '#fff' }}>
              <div style={{ opacity: 0.85, fontSize: 12, marginBottom: 4 }}>对话数</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{overview.totalConversations}</div>
              <div style={{ opacity: 0.7, fontSize: 11, marginTop: 4 }}>Conversations</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #a8edea, #fed6e3)', border: 'none' }} bodyStyle={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ color: '#333' }}>
              <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 4 }}>人均对话</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{overview.avgConversationsPerVisitor}</div>
              <div style={{ opacity: 0.6, fontSize: 11, marginTop: 4 }}>Per Visitor</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 趋势图 + 漏斗 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title={<span style={{ color: textPrimary }}>DAU + 页面浏览趋势</span>} style={{ background: cardBg }}>
            {trend.length > 0 ? <Line {...trendConfig} /> : <Empty description="暂无趋势数据" />}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title={<span style={{ color: textPrimary }}>转化漏斗</span>} style={{ background: cardBg }}>
            {funnelChartData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {funnelChartData.map((step, i) => (
                  <div key={step.stage}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: textSecondary, fontSize: 13 }}>{step.stage}</span>
                      <span style={{ color: textPrimary, fontWeight: 600, fontSize: 13 }}>
                        {step.count} <span style={{ color: chartColors[0], fontSize: 11 }}>({step.rate}%)</span>
                      </span>
                    </div>
                    <Progress
                      percent={step.rate}
                      showInfo={false}
                      strokeColor={chartColors[i % chartColors.length]}
                      trailColor={isDark ? '#374151' : '#e5e7eb'}
                      size="small"
                    />
                  </div>
                ))}
              </div>
            ) : <Empty description="暂无漏斗数据" />}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default function PrismaticOverviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 50, textAlign: 'center' }}><Spin tip="加载中..." /></div>}>
      <OverviewPageWithSuspense />
    </Suspense>
  )
}
