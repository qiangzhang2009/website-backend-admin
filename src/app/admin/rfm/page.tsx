/**
 * RFM 用户价值分析页面
 * 使用 Ant Design 组件，支持深色主题和客户端筛选
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, Row, Col, Table, Tag, Button, Space, Statistic, Tabs, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useTheme } from '@/components/AdminLayout'

interface RfmData {
  visitorId: string
  displayLabel: string
  device: string
  location: string
  lastPage: string
  lastVisit: string
  visitCount: number
  inquiryCount: number
  inquiryName: string | null
  inquiryCompany: string | null
  toolCount: number
  rScore: number
  fScore: number
  mScore: number
  rfmScore: number
  rfmSegment: string
  calculatedAt: string
}

interface RfmSummary {
  VIP: number
  Regular: number
  At_Risk: number
  Lost: number
  total: number
}

const SEGMENT_CONFIG = {
  VIP: { label: '高价值用户', gradient: 'linear-gradient(135deg, #f59e0b, #ea580c)', textColor: '#fff' },
  Regular: { label: '普通用户', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', textColor: '#fff' },
  At_Risk: { label: '风险用户', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)', textColor: '#fff' },
  Lost: { label: '流失用户', gradient: 'linear-gradient(135deg, #6b7280, #374151)', textColor: '#fff' },
}

const SCORE_COLORS = ['#9ca3af', '#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e']

export default function RfmPage() {
  const searchParams = useSearchParams()
  const tenant = searchParams.get('tenant') || 'zxqconsulting'
  const { isDark, textPrimary, textSecondary, textMuted, cardBg } = useTheme()
  
  const [allData, setAllData] = useState<RfmData[]>([])
  const [summary, setSummary] = useState<RfmSummary>({ VIP: 0, Regular: 0, At_Risk: 0, Lost: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState<string>('')

  // 客户端筛选 - 基于 allData 进行筛选
  const data = useMemo(() => {
    if (!selectedSegment) return allData
    return allData.filter(item => item.rfmSegment === selectedSegment)
  }, [allData, selectedSegment])

  useEffect(() => {
    fetchData()
  }, [tenant])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/rfm?tenant=${tenant}`)
      const result = await res.json()
      
      if (result.data) {
        setAllData(result.data)
      }
      if (result.summary) {
        setSummary(result.summary)
      }
    } catch (error) {
      console.error('Failed to fetch RFM data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function calculateRfm() {
    setCalculating(true)
    try {
      const res = await fetch(`/api/admin/rfm?tenant=${tenant}`, { method: 'POST' })
      const result = await res.json()
      
      if (result.success) {
        message.success(`RFM 计算完成，共处理 ${result.processed || allData.length} 条记录`)
        fetchData()
      }
    } catch (error) {
      console.error('Failed to calculate RFM:', error)
      message.error('RFM 计算失败')
    } finally {
      setCalculating(false)
    }
  }

  const segmentData = [
    { key: '', label: '全部', gradient: isDark ? '#374151' : '#f3f4f6', textColor: textPrimary, count: summary.total },
    { key: 'VIP', ...SEGMENT_CONFIG.VIP, count: summary.VIP },
    { key: 'Regular', ...SEGMENT_CONFIG.Regular, count: summary.Regular },
    { key: 'At_Risk', ...SEGMENT_CONFIG.At_Risk, count: summary.At_Risk },
    { key: 'Lost', ...SEGMENT_CONFIG.Lost, count: summary.Lost },
  ]

  const columns = [
    {
      title: '访客标识',
      dataIndex: 'displayLabel',
      key: 'displayLabel',
      width: 180,
      render: (v: string, record: RfmData) => (
        <div>
          <div style={{ fontWeight: 500, color: textPrimary }}>{v}</div>
          {record.inquiryName && (
            <div style={{ fontSize: 11, color: textMuted }}>{record.inquiryCompany || '个人用户'}</div>
          )}
        </div>
      ),
    },
    {
      title: '设备/位置',
      dataIndex: 'device',
      key: 'device',
      width: 140,
      render: (device: string, record: RfmData) => (
        <div style={{ fontSize: 12 }}>
          <div style={{ color: textSecondary }}>{device}</div>
          {record.location && record.location !== '未知' && (
            <div style={{ color: textMuted }}>{record.location}</div>
          )}
        </div>
      ),
    },
    {
      title: '最近访问',
      dataIndex: 'lastVisit',
      key: 'lastVisit',
      width: 100,
      sorter: (a: RfmData, b: RfmData) => new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime(),
      render: (v: string) => {
        const date = new Date(v)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        let text = ''
        let color = textMuted
        if (diffDays === 0) {
          text = '今天'
          color = '#22c55e'
        } else if (diffDays === 1) {
          text = '昨天'
          color = '#3b82f6'
        } else if (diffDays < 7) {
          text = `${diffDays}天前`
          color = '#f59e0b'
        } else if (diffDays < 30) {
          text = `${Math.floor(diffDays / 7)}周前`
          color = textMuted
        } else {
          text = `${Math.floor(diffDays / 30)}月前`
          color = '#6b7280'
        }
        return <span style={{ color, fontSize: 12 }}>{text}</span>
      },
    },
    {
      title: '访问次数',
      dataIndex: 'visitCount',
      key: 'visitCount',
      width: 80,
      sorter: (a: RfmData, b: RfmData) => a.visitCount - b.visitCount,
      render: (v: number) => (
        <span style={{ color: textPrimary, fontWeight: 500 }}>{v}</span>
      ),
    },
    {
      title: 'R分数',
      dataIndex: 'rScore',
      key: 'rScore',
      width: 80,
      render: (score: number) => (
        <div style={{ textAlign: 'center' }}>
          <span style={{
            width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: SCORE_COLORS[score] || SCORE_COLORS[0], color: '#fff', fontWeight: 'bold', fontSize: 11
          }}>
            {score}
          </span>
        </div>
      ),
    },
    {
      title: 'F分数',
      dataIndex: 'fScore',
      key: 'fScore',
      width: 80,
      render: (score: number) => (
        <div style={{ textAlign: 'center' }}>
          <span style={{
            width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: SCORE_COLORS[score] || SCORE_COLORS[0], color: '#fff', fontWeight: 'bold', fontSize: 11
          }}>
            {score}
          </span>
        </div>
      ),
    },
    {
      title: 'M分数',
      dataIndex: 'mScore',
      key: 'mScore',
      width: 80,
      render: (score: number) => (
        <div style={{ textAlign: 'center' }}>
          <span style={{
            width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: SCORE_COLORS[score] || SCORE_COLORS[0], color: '#fff', fontWeight: 'bold', fontSize: 11
          }}>
            {score}
          </span>
        </div>
      ),
    },
    {
      title: '询盘/工具',
      key: 'interactions',
      width: 100,
      render: (_: any, record: RfmData) => (
        <Space direction="vertical" size={0}>
          {record.inquiryCount > 0 && (
            <Tag color="green">询盘 {record.inquiryCount}</Tag>
          )}
          {record.toolCount > 0 && (
            <Tag color="blue">工具 {record.toolCount}</Tag>
          )}
          {record.inquiryCount === 0 && record.toolCount === 0 && (
            <span style={{ color: textMuted, fontSize: 12 }}>无互动</span>
          )}
        </Space>
      ),
    },
    {
      title: 'RFM总分',
      dataIndex: 'rfmScore',
      key: 'rfmScore',
      sorter: (a: RfmData, b: RfmData) => a.rfmScore - b.rfmScore,
      render: (v: number) => <span style={{ color: textPrimary, fontWeight: 'bold', fontSize: 18 }}>{v}</span>,
    },
    {
      title: '用户分群',
      dataIndex: 'rfmSegment',
      key: 'rfmSegment',
      render: (seg: string) => {
        const config = SEGMENT_CONFIG[seg as keyof typeof SEGMENT_CONFIG]
        if (!config) return <Tag>{seg}</Tag>
        return (
          <Tag style={{ background: config.gradient, color: config.textColor, border: 'none' }}>
            {config.label}
          </Tag>
        )
      },
    },
    {
      title: '计算时间',
      dataIndex: 'calculatedAt',
      key: 'calculatedAt',
      render: (v: string) => <span style={{ color: textMuted }}>{v ? new Date(v).toLocaleDateString() : '-'}</span>,
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary }}>RFM 用户价值分析</h2>
        <Button type="primary" loading={calculating} onClick={calculateRfm}>
          {calculating ? '计算中...' : '重新计算 RFM'}
        </Button>
      </div>

      {/* 分段统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {segmentData.slice(1).map((seg) => (
          <Col xs={12} sm={6} key={seg.key}>
            <Card 
              hoverable
              onClick={() => setSelectedSegment(seg.key)}
              style={{ 
                background: seg.gradient, 
                color: seg.textColor,
                border: selectedSegment === seg.key ? '2px solid #818cf8' : undefined,
                cursor: 'pointer',
              }}
            >
              <Statistic 
                title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>{seg.label}</span>} 
                value={seg.count} 
                valueStyle={{ color: seg.textColor, fontSize: 28 }}
              />
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>
                {summary.total > 0 ? ((seg.count / summary.total) * 100).toFixed(1) : 0}%
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 用户分布条 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: textPrimary, fontWeight: 500 }}>用户分布</span>
        </div>
        <div style={{ 
          display: 'flex', 
          height: 24, 
          borderRadius: 12, 
          overflow: 'hidden',
          background: isDark ? '#374151' : '#e5e7eb',
        }}>
          {segmentData.slice(1).map((seg) => (
            <div
              key={seg.key}
              style={{
                width: summary.total > 0 ? `${(seg.count / summary.total) * 100}%` : '0%',
                background: seg.gradient,
                minWidth: seg.count > 0 ? '2px' : '0',
              }}
              title={`${seg.label}: ${seg.count}`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: textMuted, fontSize: 12 }}>
          <span>VIP: {summary.VIP}</span>
          <span>普通: {summary.Regular}</span>
          <span>风险: {summary.At_Risk}</span>
          <span>流失: {summary.Lost}</span>
        </div>
      </Card>

      {/* 分群筛选按钮 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          {segmentData.map((seg) => (
            <Button
              key={seg.key}
              type={selectedSegment === seg.key ? 'primary' : 'default'}
              onClick={() => setSelectedSegment(seg.key)}
            >
              {seg.label} ({seg.count})
            </Button>
          ))}
        </Space>
      </Card>

      {/* RFM 详情表格 */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: textMuted }}>
            {selectedSegment ? '该分类暂无数据' : '暂无数据，请先点击"重新计算 RFM"'}
          </div>
        ) : (
          <Table
            dataSource={data}
            rowKey="visitorId"
            pagination={{ 
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total: number) => `共 ${total} 条记录`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            columns={columns}
            size="small"
          />
        )}
      </Card>

      {/* RFM 说明 */}
      <Card style={{ marginTop: 24 }}>
        <h3 style={{ color: textPrimary, marginBottom: 16 }}>RFM 分析说明</h3>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={8}>
            <div style={{ color: textSecondary }}>
              <div style={{ fontWeight: 500, color: textPrimary, marginBottom: 4 }}>R (Recency) - 最近访问</div>
              <div style={{ fontSize: 12 }}>5分：7天内访问 | 4分：14天内 | 3分：30天内 | 2分：90天内 | 1分：超过90天</div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ color: textSecondary }}>
              <div style={{ fontWeight: 500, color: textPrimary, marginBottom: 4 }}>F (Frequency) - 访问频率</div>
              <div style={{ fontSize: 12 }}>5分：超过10次 | 4分：5-10次 | 3分：2-4次 | 2分：2次 | 1分：1次</div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ color: textSecondary }}>
              <div style={{ fontWeight: 500, color: textPrimary, marginBottom: 4 }}>M (Monetary) - 行为价值</div>
              <div style={{ fontSize: 12 }}>5分：超过20次行为 | 4分：10-20次 | 3分：5-10次 | 2分：2-5次 | 1分：1次</div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
