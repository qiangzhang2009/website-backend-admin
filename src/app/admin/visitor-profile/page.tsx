/**
 * 访客画像分析页面
 * 基于设备/行为数据推断年龄、消费能力、成交概率
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Table, Tag, Button, Space, Row, Col, Progress, Tooltip, Spin, Statistic, Badge } from 'antd'
import { ReloadOutlined, UserOutlined, DollarOutlined, AimOutlined, ThunderboltOutlined, GlobalOutlined, MobileOutlined, StarOutlined } from '@ant-design/icons'
import { useSearchParams } from 'next/navigation'
import dayjs from 'dayjs'
import { useTheme } from '@/components/AdminLayout'

function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || 'zxqconsulting'
}

interface VisitorProfile {
  visitor_id: string
  device: {
    type: string
    brand: string
    tier: number
    isHighEnd: boolean
    browser: string
    os: string
  }
  location: {
    country: string
    city: string
    tier: number
  }
  behavior: {
    sessions: number
    pageViews: number
    toolInteractions: number
    hasInquiry: boolean
    trafficSource: string
  }
  profile: {
    estimatedAge: {
      minAge: number
      maxAge: number
      generation: string
    }
    purchasePower: {
      score: number
      level: string
    }
    intentScore: {
      score: number
      level: string
    }
    conversionProbability: {
      probability: number
      level: string
    }
  }
  lastVisit: string
  firstVisit: string
}

const getTierColor = (tier: number) => {
  if (tier >= 8) return '#10b981' // 绿色 - 高端
  if (tier >= 5) return '#f59e0b' // 黄色 - 中端
  return '#6b7280' // 灰色 - 低端
}

const getIntentColor = (score: number) => {
  if (score >= 60) return '#10b981'
  if (score >= 40) return '#f59e0b'
  return '#6b7280'
}

const getConversionColor = (prob: number) => {
  if (prob >= 50) return '#10b981'
  if (prob >= 30) return '#f59e0b'
  return '#6b7280'
}

export default function VisitorProfilePage() {
  const TENANT = useTenantFromURL()
  const { textSecondary, textMuted, textPrimary } = useTheme()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<VisitorProfile[]>([])
  const [summary, setSummary] = useState<any>({})

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchData = useCallback(async (pageNum = 1, pageSizeNum = 10) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/visitor-profile?tenant=${TENANT}&page=${pageNum}&pageSize=${pageSizeNum}`)
      const result = await res.json()
      if (result.error) {
        console.error('API error:', result.error)
        setData([])
      } else {
        setData(result.data || [])
        setSummary(result.summary || {})
      }
    } catch (e) {
      console.error('Visitor profile fetch error:', e)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [TENANT])

  const handleRefresh = useCallback(() => {
    fetchData(page, pageSize)
  }, [fetchData, page, pageSize])

  const handlePageChange = useCallback((pageNum: number, pageSizeNum: number) => {
    setPage(pageNum)
    setPageSize(pageSizeNum)
    fetchData(pageNum, pageSizeNum)
  }, [fetchData])

  useEffect(() => {
    fetchData(page, pageSize)
  }, [fetchData, page, pageSize, TENANT])

  const columns = [
    {
      title: '访客',
      key: 'visitor',
      width: 160,
      render: (_: unknown, r: VisitorProfile) => (
        <div>
          <Tooltip title={r.visitor_id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MobileOutlined style={{ color: r.device.isHighEnd ? '#10b981' : '#6b7280' }} />
              <span style={{ color: '#8b5cf6', fontWeight: 500, fontSize: 12 }}>
                {r.device.brand || r.device.type || 'Unknown'}
              </span>
            </div>
          </Tooltip>
          <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
            {r.device.os} · {r.device.browser}
          </div>
        </div>
      ),
    },
    {
      title: '位置',
      key: 'location',
      width: 120,
      render: (_: unknown, r: VisitorProfile) => (
        <div>
          <Tag icon={<GlobalOutlined />} color="default">
            {r.location.country || 'Unknown'}
          </Tag>
          {r.location.city && (
            <span style={{ fontSize: 11, color: textMuted }}> · {r.location.city}</span>
          )}
        </div>
      ),
    },
    {
      title: '年龄段',
      key: 'age',
      width: 120,
      render: (_: unknown, r: VisitorProfile) => (
        <div>
          <Tag color="blue">{r.profile.estimatedAge.generation}</Tag>
          <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
            {r.profile.estimatedAge.minAge}-{r.profile.estimatedAge.maxAge}岁
          </div>
        </div>
      ),
    },
    {
      title: '消费能力',
      key: 'purchasePower',
      width: 140,
      render: (_: unknown, r: VisitorProfile) => {
        const { score, level } = r.profile.purchasePower
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Progress 
                percent={score} 
                size="small" 
                strokeColor={getTierColor(score / 10)}
                style={{ width: 60 }}
              />
              <Tag color={score >= 70 ? 'green' : score >= 40 ? 'orange' : 'default'}>
                {level}
              </Tag>
            </div>
          </div>
        )
      },
    },
    {
      title: '意向度',
      key: 'intent',
      width: 140,
      render: (_: unknown, r: VisitorProfile) => {
        const { score, level } = r.profile.intentScore
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Progress 
                percent={score} 
                size="small" 
                strokeColor={getIntentColor(score)}
                style={{ width: 60 }}
              />
              <Tag color={score >= 60 ? 'green' : score >= 40 ? 'orange' : 'default'}>
                {level}
              </Tag>
            </div>
          </div>
        )
      },
    },
    {
      title: '成交概率',
      key: 'conversion',
      width: 140,
      render: (_: unknown, r: VisitorProfile) => {
        const { probability, level } = r.profile.conversionProbability
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Progress 
                percent={probability} 
                size="small" 
                strokeColor={getConversionColor(probability)}
                style={{ width: 60 }}
              />
              <Tag color={probability >= 50 ? 'green' : probability >= 30 ? 'orange' : 'default'}>
                {probability}%
              </Tag>
            </div>
            <div style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>{level}</div>
          </div>
        )
      },
    },
    {
      title: '行为',
      key: 'behavior',
      width: 120,
      render: (_: unknown, r: VisitorProfile) => (
        <div style={{ fontSize: 11, color: textSecondary }}>
          <div>会话: {r.behavior.sessions}</div>
          <div>浏览: {r.behavior.pageViews}页</div>
          {r.behavior.toolInteractions > 0 && (
            <Tag color="purple" style={{ marginTop: 2 }}>工具交互 {r.behavior.toolInteractions}次</Tag>
          )}
          {r.behavior.hasInquiry && (
            <Tag color="green" style={{ marginTop: 2 }} icon={<StarOutlined />}>已询盘</Tag>
          )}
        </div>
      ),
    },
    {
      title: '最后访问',
      dataIndex: 'lastVisit',
      key: 'lastVisit',
      width: 100,
      render: (v: string) => (
        <span style={{ color: textMuted, fontSize: 12 }}>
          {dayjs(v).format('MM-DD HH:mm')}
        </span>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>访客画像分析</h2>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>刷新</Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}>
          <Card hoverable>
            <Statistic 
              title="总访客" 
              value={summary.totalVisitors || 0} 
              prefix={<UserOutlined />}
              valueStyle={{ color: '#8b5cf6' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card hoverable>
            <Statistic 
              title="高意向访客" 
              value={summary.highIntentVisitors || 0} 
              prefix={<AimOutlined />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card hoverable>
            <Statistic 
              title="高消费力" 
              value={summary.highPurchasePower || 0} 
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 平均成交概率 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col>
            <ThunderboltOutlined style={{ fontSize: 32, color: '#8b5cf6' }} />
          </Col>
          <Col>
            <div style={{ fontSize: 14, color: textMuted }}>平均成交概率</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: getConversionColor(summary.avgConversionProbability || 0) }}>
              {summary.avgConversionProbability || 0}%
            </div>
          </Col>
          <Col>
            <Tag color="green" style={{ marginLeft: 16 }}>
              {summary.withInquiries || 0} 人已询盘
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* 访客列表 */}
      <Card>
        <Table 
          columns={columns} 
          dataSource={data} 
          loading={loading}
          rowKey="visitor_id"
          pagination={{ 
            current: page,
            pageSize: pageSize,
            total: summary.totalVisitors || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number) => `共 ${total} 条访客记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: handlePageChange,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  )
}
