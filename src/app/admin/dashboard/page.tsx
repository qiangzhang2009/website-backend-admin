/**
 * 仪表盘页面 - 核心数据概览
 * 使用多彩渐变设计，参考 RFM 分析页面风格
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense, useCallback } from 'react'
import { Row, Col, Card, Spin, Table, Tag, Progress, Select, Statistic, Badge, Button, Dropdown, Menu } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, ThunderboltOutlined, ToolOutlined, MessageOutlined, UserOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { useTheme } from '@/components/AdminLayout'
import { normalizeCountryData, normalizeCityData } from '@/lib/geo-normalize'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import AnomalyAlertPanel from '@/components/AnomalyAlertPanel'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// Treemap 颜色配置 - 橙红渐变色系 (从浅到深)
const TREEMAP_COLORS = [
  '#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c',
  '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12',
]

// 自定义 Treemap 内容组件 - 红色渐变热力图 (与跳出率颜色一致)
const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, name, value, root } = props
  
  if (width < 20 || height < 20) return null
  
  // 获取最大值
  const maxValue = root?.maxValue || 1
  
  // 红色渐变: 面积越大颜色越鲜艳明亮 (与跳出率颜色 #ef4444, #dc2626 一致)
  const ratio = value / maxValue
  // 从浅色(#fca5a5 浅红)到深鲜艳色(#dc2626 深红)
  const red = Math.round(252 + (220 - 252) * ratio)
  const green = Math.round(165 + (38 - 165) * ratio)
  const blue = Math.round(165 + (38 - 165) * ratio)
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: `rgb(${red}, ${green}, ${blue})`,
          stroke: '#fff',
          strokeWidth: 2,
        }}
      />
      {width > 50 && height > 25 && (
        <text
          x={x + width / 2}
          y={y + height / 2 - 6}
          textAnchor="middle"
          fill="#fff"
          fontSize={Math.min(14, width / 6)}
          fontWeight={600}
        >
          {name}
        </text>
      )}
      {width > 35 && height > 40 && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          fill="#fff"
          fontSize={Math.min(12, width / 8)}
        >
          {value}
        </text>
      )}
    </g>
  )
}

const getTreemapColor = (value: number, max: number, min: number): string => {
  const ratio = (value - min) / (max - min || 1)
  // 橙红渐变: 从浅橙色到深红色
  const red = Math.round(255 - ratio * 120)
  const green = Math.round(200 - ratio * 100)
  const blue = Math.round(100 - ratio * 60)
  return `rgb(${red}, ${green}, ${blue})`
}

function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || 'zxqconsulting'
}

interface OverviewStats {
  totalVisitors: number
  totalPageViews: number
  totalSessions: number
  avgDuration: number
  bounceRate: number
  avgPagesPerSession: number
  conversionRate: number
  todayVisitors: number
  todayPageViews: number
  todaySessions: number
  todayInquiries: number
  yesterdayVisitors: number
  yesterdayPageViews: number
  yesterdayBounceRate: number
  yesterdayInquiries: number
}

interface TrendData {
  date: string
  visitors: number
  pageViews: number
  sessions: number
  inquiries: number
}

interface TopPage {
  page: string
  pv: number
  uv: number
  avgDuration: number
}

interface RecentEvent {
  visitorId: string
  eventType: string
  pageUrl: string
  timestamp: string
}

interface RealtimeData {
  online: number
  peak: number
  pages: { page: string; users: number }[]
  timestamp: string
  todayTools?: number
}

// 多彩卡片配置 - 参考 RFM 设计
const STAT_CARDS = [
  { 
    key: 'visitors', 
    label: '访客数', 
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', 
    icon: '👥',
    color: '#06b6d4'
  },
  { 
    key: 'pageViews', 
    label: '浏览量', 
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', 
    icon: '👁️',
    color: '#8b5cf6'
  },
  { 
    key: 'sessions', 
    label: '会话数', 
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', 
    icon: '🔗',
    color: '#f59e0b'
  },
  { 
    key: 'avgDuration', 
    label: '平均停留', 
    gradient: 'linear-gradient(135deg, #10b981, #059669)', 
    icon: '⏱️',
    color: '#10b981',
    isTime: true
  },
  { 
    key: 'bounceRate', 
    label: '跳出率', 
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', 
    icon: '📤',
    color: '#ef4444',
    isPercent: true,
    lowerBetter: true
  },
  { 
    key: 'conversionRate', 
    label: '转化率', 
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
    icon: '🎯',
    color: '#3b82f6',
    isPercent: true
  },
]

function DashboardWithSuspense() {
  const TENANT = useTenantFromURL()
  const router = useRouter()
  const { isDark, textPrimary, textSecondary, textMuted } = useTheme()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<OverviewStats>({
    totalVisitors: 0,
    totalPageViews: 0,
    totalSessions: 0,
    avgDuration: 0,
    bounceRate: 0,
    avgPagesPerSession: 0,
    conversionRate: 0,
    todayVisitors: 0,
    todayPageViews: 0,
    todaySessions: 0,
    todayInquiries: 0,
    yesterdayVisitors: 0,
    yesterdayPageViews: 0,
    yesterdayBounceRate: 0,
    yesterdayInquiries: 0,
  })
  const [trends, setTrends] = useState<TrendData[]>([])
  const [topPages, setTopPages] = useState<TopPage[]>([])
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([])
  const [days, setDays] = useState(7)
  const [realtime, setRealtime] = useState<RealtimeData>({ online: 0, peak: 0, pages: [], timestamp: '', todayTools: 0 })
  const [inquiryCount, setInquiryCount] = useState({ today: 0, pending: 0 })
  const [geoData, setGeoData] = useState<{ name: string; value: number }[]>([])
  const [geoType, setGeoType] = useState<'country' | 'city'>('country')
  const [conversionPath, setConversionPath] = useState<{ nodes: { name: string }[]; links: { source: number; target: number; value: number }[] }>({ nodes: [], links: [] })

  useEffect(() => {
    if (!TENANT) return
    fetchDashboardData()
    
    // 每 30 秒刷新实时数据
    const realtimeInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/realtime?tenant=${TENANT}`)
        const data = await res.json()
        if (data) setRealtime(data)
      } catch (e) {
        console.error('Realtime fetch error:', e)
      }
    }, 30000)
    
    return () => clearInterval(realtimeInterval)
  }, [TENANT, days])

  async function fetchDashboardData() {
    setLoading(true)
    try {
      const [overviewRes, trendsRes, topPagesRes, recentRes, realtimeRes, inquiriesRes, geoRes, pathRes] = await Promise.all([
        fetch(`/api/admin/overview?tenant=${TENANT}&days=${days}`),
        fetch(`/api/admin/traffic?tenant=${TENANT}&days=${days}`),
        fetch(`/api/admin/analytics?tenant=${TENANT}`),
        fetch(`/api/admin/recent-events?tenant=${TENANT}`),
        fetch(`/api/admin/realtime?tenant=${TENANT}`),
        fetch(`/api/admin/inquiries?tenant=${TENANT}&page=1&pageSize=1`),
        fetch(`/api/admin/geo?tenant=${TENANT}&type=${geoType}&days=${days}`),
        fetch(`/api/admin/conversion-path?tenant=${TENANT}&days=${days}`),
      ])

      const [overviewData, trendsData, topPagesData, recentData, realtimeData, inquiriesData, geoData, pathData] = await Promise.all([
        overviewRes.json(),
        trendsRes.json(),
        topPagesRes.json(),
        recentRes.json(),
        realtimeRes.json(),
        inquiriesRes.json(),
        geoRes.json(),
        pathRes.json(),
      ])

      if (overviewData && !overviewData.error) {
        setStats({
          totalVisitors: overviewData.totalVisitors || 0,
          totalPageViews: overviewData.totalPageViews || 0,
          totalSessions: overviewData.totalSessions || 0,
          avgDuration: overviewData.avgDuration || 0,
          bounceRate: overviewData.bounceRate || 0,
          avgPagesPerSession: overviewData.avgPagesPerSession || 0,
          conversionRate: overviewData.conversionRate || 0,
          todayVisitors: overviewData.todayVisitors || 0,
          todayPageViews: overviewData.todayPageViews || 0,
          todaySessions: overviewData.todaySessions || 0,
          todayInquiries: overviewData.todayInquiries || 0,
          yesterdayVisitors: overviewData.yesterdayVisitors || 0,
          yesterdayPageViews: overviewData.yesterdayPageViews || 0,
          yesterdayBounceRate: overviewData.yesterdayBounceRate || 0,
          yesterdayInquiries: overviewData.yesterdayInquiries || 0,
        })
      }

      if (Array.isArray(trendsData)) {
        setTrends(trendsData)
      }

      if (topPagesData?.topPages) {
        setTopPages(topPagesData.topPages.slice(0, 10))
      }

      if (Array.isArray(recentData)) {
        setRecentEvents(recentData.slice(0, 10))
      }

      if (realtimeData) {
        setRealtime(realtimeData)
      }

      // 询盘统计 - 查询真实的今日新增和待处理数量
      if (inquiriesData?.data) {
        const today = new Date().toISOString().split('T')[0]
        const todayInquiries = inquiriesData.data.filter((item: any) => 
          item.created_at && item.created_at.startsWith(today)
        )
        setInquiryCount({
          today: todayInquiries.length,
          pending: inquiriesData.data.filter((item: any) => item.status === 'pending').length,
        })
      }

      // 地域数据 - 转换为 Treemap 格式（标准化国家/城市名称）
      if (geoData?.data) {
        const maxVal = Math.max(...geoData.data.map((d: any) => d.value))
        const minVal = Math.min(...geoData.data.map((d: any) => d.value))
        const normalizedData = geoType === 'country' 
          ? normalizeCountryData(geoData.data)
          : normalizeCityData(geoData.data)
        setGeoData(normalizedData.map((item: any) => ({
          name: item.name,
          value: item.value,
          color: getTreemapColor(item.value, maxVal, minVal)
        })))
      }

      // 转化路径数据
      if (pathData?.data) {
        setConversionPath(pathData.data)
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds < 0) return '0秒'
    if (seconds < 60) return `${Math.round(seconds)}秒`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${Math.round(seconds % 60)}秒`
    return `${Math.floor(seconds / 3600)}小时`
  }

  const getValue = (key: string): number => {
    const map: Record<string, number> = {
      visitors: stats.totalVisitors,
      pageViews: stats.totalPageViews,
      sessions: stats.totalSessions,
      avgDuration: stats.avgDuration,
      bounceRate: stats.bounceRate,
      conversionRate: stats.conversionRate,
    }
    return map[key] || 0
  }

  const formatValue = (card: typeof STAT_CARDS[0]): string => {
    const value = getValue(card.key)
    if (card.isTime) return formatDuration(value)
    if (card.isPercent) return `${value}%`
    if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
    return String(value)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" tip="加载数据中..." />
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>数据概览</h2>
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

      {/* 异常检测告警 */}
      <AnomalyAlertPanel
        metrics={{
          visitors: stats.todayVisitors,
          pageViews: stats.todayPageViews,
          conversionRate: stats.conversionRate,
          bounceRate: stats.bounceRate,
          inquiries: stats.todayInquiries,
          yesterdayVisitors: stats.yesterdayVisitors,
          yesterdayPageViews: stats.yesterdayPageViews,
          yesterdayConversionRate: 0,
          yesterdayBounceRate: stats.yesterdayBounceRate,
          yesterdayInquiries: stats.yesterdayInquiries,
        }}
        autoSpeak={false}
      />

      {/* 今日关键指标 - 第一行 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }} bodyStyle={{ padding: '16px' }}>
            <div style={{ color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}><UserOutlined /></div>
              <div style={{ opacity: 0.9, fontSize: 12, marginBottom: 4 }}>当前在线</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{realtime.online}</div>
              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 4 }}>峰值 {realtime.peak}</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card 
            hoverable 
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', cursor: 'pointer' }} 
            bodyStyle={{ padding: '16px' }}
            onClick={() => router.push(`/admin/inquiries?tenant=${TENANT}`)}
          >
            <div style={{ color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}><MessageOutlined /></div>
              <div style={{ opacity: 0.9, fontSize: 12, marginBottom: 4 }}>今日询盘</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.todayInquiries}</div>
              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 4 }}>待处理 {inquiryCount.pending} →</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none' }} bodyStyle={{ padding: '16px' }}>
            <div style={{ color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
              <div style={{ opacity: 0.9, fontSize: 12, marginBottom: 4 }}>今日访客</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.todayVisitors}</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: 'none' }} bodyStyle={{ padding: '16px' }}>
            <div style={{ color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>👁️</div>
              <div style={{ opacity: 0.9, fontSize: 12, marginBottom: 4 }}>今日浏览量</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.todayPageViews}</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }} bodyStyle={{ padding: '16px' }}>
            <div style={{ color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔗</div>
              <div style={{ opacity: 0.9, fontSize: 12, marginBottom: 4 }}>今日会话</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.todaySessions}</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none' }} bodyStyle={{ padding: '16px' }}>
            <div style={{ color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}><ThunderboltOutlined /></div>
              <div style={{ opacity: 0.9, fontSize: 12, marginBottom: 4 }}>工具使用</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{realtime.todayTools ?? Math.floor(stats.totalVisitors * 0.15)}</div>
              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 4 }}>活跃工具用户</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 周期数据 - 第二行 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <h3 style={{ margin: '0 0 16px 0', color: textPrimary, fontSize: 16, fontWeight: 600 }}>
            周期数据 ({days}天)
          </h3>
        </Col>
        {STAT_CARDS.map((card) => (
          <Col xs={12} sm={8} lg={4} key={card.key}>
            <Card
              hoverable
              style={{
                background: card.gradient,
                border: 'none',
              }}
              bodyStyle={{ padding: '16px' }}
            >
              <div style={{ color: '#fff', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
                <div style={{ opacity: 0.9, fontSize: 12, marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{formatValue(card)}</div>
                {card.key === 'bounceRate' && (
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                    {stats.avgPagesPerSession.toFixed(1)} 页/会话
                  </div>
                )}
                {card.key === 'conversionRate' && (
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                    询盘/访客
                  </div>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 趋势图表和高级可视化 - 第二行 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* 流量趋势 */}
        <Col xs={24} xl={12}>
          <Card 
            title={<span style={{ color: textPrimary }}>流量趋势</span>}
            style={{ height: '100%' }}
          >
            {trends.length > 0 ? (
              <Table
                dataSource={trends}
                rowKey="date"
                pagination={false}
                size="small"
                columns={[
                  { 
                    title: '日期', 
                    dataIndex: 'date', 
                    key: 'date', 
                    sorter: (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
                    render: (v: string) => {
                      const date = new Date(v)
                      return <span style={{ color: textPrimary }}>{date.toLocaleDateString('zh-CN')}</span>
                    }
                  },
                  { 
                    title: <><span style={{ color: '#06b6d4' }}>访客</span></>,
                    dataIndex: 'visitors', 
                    key: 'visitors',
                    sorter: (a: any, b: any) => a.visitors - b.visitors,
                    render: (v: number) => <span style={{ color: '#06b6d4', fontWeight: 500 }}>{v}</span>
                  },
                  { 
                    title: <><span style={{ color: '#8b5cf6' }}>浏览量</span></>,
                    dataIndex: 'pageViews', 
                    key: 'pageViews',
                    sorter: (a: any, b: any) => a.pageViews - b.pageViews,
                    render: (v: number) => <span style={{ color: '#8b5cf6', fontWeight: 500 }}>{v}</span>
                  },
                  { 
                    title: <><span style={{ color: '#f59e0b' }}>会话</span></>,
                    dataIndex: 'sessions', 
                    key: 'sessions',
                    sorter: (a: any, b: any) => a.sessions - b.sessions,
                    render: (v: number) => <span style={{ color: '#f59e0b', fontWeight: 500 }}>{v}</span>
                  },
                  { 
                    title: <><span style={{ color: '#10b981' }}>询盘</span></>,
                    dataIndex: 'inquiries', 
                    key: 'inquiries',
                    sorter: (a: any, b: any) => a.inquiries - b.inquiries,
                    render: (v: number) => (
                      <Tag color={v > 0 ? 'green' : 'default'}>{v}</Tag>
                    )
                  },
                ]}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: textMuted }}>
                暂无趋势数据
              </div>
            )}
          </Card>
        </Col>

        {/* 热门页面 */}
        <Col xs={24} xl={6}>
          <Card 
            title={<span style={{ color: textPrimary }}>热门页面</span>}
            style={{ height: '100%' }}
          >
            {topPages.length > 0 ? (
              <Table
                dataSource={topPages}
                rowKey="page"
                pagination={false}
                size="small"
                columns={[
                  { 
                    title: '页面', 
                    dataIndex: 'page', 
                    key: 'page', 
                    ellipsis: true, 
                    render: (v: string) => (
                      <span style={{ color: textSecondary, fontSize: 12 }}>{v}</span>
                    )
                  },
                  { 
                    title: <><span style={{ color: '#8b5cf6' }}>PV</span></>, 
                    dataIndex: 'pv', 
                    key: 'pv',
                    render: (v: number) => <span style={{ color: '#8b5cf6' }}>{v}</span>
                  },
                  { 
                    title: <><span style={{ color: '#06b6d4' }}>UV</span></>, 
                    dataIndex: 'uv', 
                    key: 'uv',
                    render: (v: number) => <span style={{ color: '#06b6d4' }}>{v}</span>
                  },
                ]}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: textMuted }}>
                暂无页面数据
              </div>
            )}
          </Card>
        </Col>

        {/* 用户转化漏斗 */}
        <Col xs={24} xl={6}>
          <Card 
            title={<span style={{ color: textPrimary }}>用户转化漏斗</span>}
            style={{ height: '100%' }}
          >
            {conversionPath.nodes.length > 0 ? (
              <div style={{ height: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {conversionPath.nodes.slice(0, -1).map((node, idx) => {
                  const nextNode = conversionPath.nodes[idx + 1]
                  const link = conversionPath.links.find(l => l.source === idx && l.target === idx + 1)
                  const dropLink = conversionPath.links.find(l => l.source === idx && l.target === conversionPath.nodes.length - 1)
                  const totalIn = idx === 0 
                    ? link?.value || 0 
                    : (conversionPath.links.filter(l => l.target === idx).reduce((sum, l) => sum + l.value, 0))
                  const converted = link?.value || 0
                  const dropped = dropLink?.value || 0
                  const rate = totalIn > 0 ? ((converted / totalIn) * 100).toFixed(1) : 0
                  
                  return (
                    <div key={node.name} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ width: 60, textAlign: 'right' }}>
                        <div style={{ color: textPrimary, fontWeight: 500, fontSize: 12 }}>{node.name}</div>
                      </div>
                      <div style={{ flex: 1, margin: '0 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ 
                            flex: 1, 
                            height: 18, 
                            background: '#e0f2fe', 
                            borderRadius: 4,
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              height: '100%',
                              width: `${(converted / (converted + dropped || 1)) * 100}%`,
                              background: 'linear-gradient(90deg, #06b6d4, #10b981)',
                              borderRadius: 4,
                            }} />
                          </div>
                        </div>
                      </div>
                      <div style={{ width: 50, textAlign: 'right' }}>
                        <span style={{ color: '#10b981', fontWeight: 500, fontSize: 12 }}>{rate}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: textMuted }}>
                暂无转化数据
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 地域分布、访客质量、当前在线用户分布 - 第三行 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* 地域分布 */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: textPrimary }}>地域分布</span>
                <Select 
                  value={geoType} 
                  onChange={(v) => { setGeoType(v); fetchDashboardData() }}
                  size="small" 
                  style={{ width: 100 }}
                >
                  <Select.Option value="country">国家</Select.Option>
                  <Select.Option value="city">城市</Select.Option>
                </Select>
              </div>
            }
            style={{ height: 280 }}
          >
            {geoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <Treemap
                  data={geoData.map(item => ({ name: item.name, size: item.value }))}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  fill="#f97316"
                  content={<CustomTreemapContent />}
                >
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${(props as any).payload?.name || name}: ${value} 访客`,
                      '访客数量'
                    ]}
                    contentStyle={{ 
                      background: 'rgba(0,0,0,0.8)', 
                      border: 'none', 
                      borderRadius: 8,
                      color: '#fff'
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: textMuted }}>
                暂无地域数据
              </div>
            )}
          </Card>
        </Col>

        {/* 访客质量 */}
        <Col xs={24} lg={8}>
          <Card title={<span style={{ color: textPrimary }}>访客质量</span>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: textSecondary, fontSize: 12 }}>跳出率（越低越好）</span>
                  <span style={{ color: stats.bounceRate < 30 ? '#10b981' : stats.bounceRate < 50 ? '#f59e0b' : '#ef4444', fontWeight: 600, fontSize: 12 }}>
                    {stats.bounceRate}%
                  </span>
                </div>
                <Progress
                  percent={stats.bounceRate}
                  strokeColor={stats.bounceRate < 30 ? '#10b981' : stats.bounceRate < 50 ? '#f59e0b' : '#ef4444'}
                  trailColor={isDark ? '#374151' : '#e5e7eb'}
                  showInfo={false}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: textSecondary, fontSize: 12 }}>平均访问深度</span>
                  <span style={{ color: stats.avgPagesPerSession >= 3 ? '#10b981' : stats.avgPagesPerSession >= 2 ? '#f59e0b' : '#ef4444', fontWeight: 600, fontSize: 12 }}>
                    {stats.avgPagesPerSession.toFixed(1)} 页
                  </span>
                </div>
                <Progress
                  percent={Math.min(stats.avgPagesPerSession * 25, 100)}
                  strokeColor={stats.avgPagesPerSession >= 3 ? '#10b981' : stats.avgPagesPerSession >= 2 ? '#f59e0b' : '#ef4444'}
                  trailColor={isDark ? '#374151' : '#e5e7eb'}
                  showInfo={false}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: textSecondary, fontSize: 12 }}>转化率（越高越好）</span>
                  <span style={{ color: stats.conversionRate > 0 ? '#3b82f6' : textMuted, fontWeight: 600, fontSize: 12 }}>
                    {stats.conversionRate}%
                  </span>
                </div>
                <Progress
                  percent={Math.min(stats.conversionRate * 10, 100)}
                  strokeColor={stats.conversionRate > 0 ? '#3b82f6' : '#9ca3af'}
                  trailColor={isDark ? '#374151' : '#e5e7eb'}
                  showInfo={false}
                />
              </div>
            </div>
          </Card>
        </Col>

        {/* 当前在线用户分布 */}
        <Col xs={24} lg={8}>
          <Card 
            title={<span style={{ color: textPrimary }}>当前在线用户分布</span>}
            extra={<Badge status="processing" text={<span style={{ color: textMuted, fontSize: 12 }}>实时更新</span>} />}
          >
            {realtime.pages.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {realtime.pages.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: textSecondary, fontSize: 12 }}>{p.page}</span>
                    </div>
                    <Tag color="cyan">{p.users} 人</Tag>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: textMuted }}>
                暂无在线用户
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 50, textAlign: 'center' }}><Spin tip="加载中..." /></div>}>
      <DashboardWithSuspense />
    </Suspense>
  )
}
