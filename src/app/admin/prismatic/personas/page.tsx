/**
 * Prismatic Analytics - 人物热度分析页
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Card, Row, Col, Table, Tag, Select, Spin, Empty, Progress, Avatar } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { useTheme } from '@/components/AdminLayout'

function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || 'prismatic'
}

interface PersonaStats {
  persona_id: string
  persona_name: string
  domain: string
  views: number
  conversations: number
  avgTurns: number
  graphClicks: number
  modeBreakdown: { mode: string; count: number }[]
}

function PersonasPageWithSuspense() {
  const TENANT = useTenantFromURL()
  const { isDark, chartColors, textPrimary, textSecondary, cardBg } = useTheme()
  const [loading, setLoading] = useState(true)
  const [personas, setPersonas] = useState<PersonaStats[]>([])
  const [days, setDays] = useState(30)
  const [domain, setDomain] = useState<string | undefined>(undefined)
  const [sort, setSort] = useState('views')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      tenant: TENANT,
      days: String(days),
      sort,
      order,
    })
    if (domain) params.set('domain', domain)

    fetch(`/api/admin/prismatic/personas?${params}`)
      .then(r => r.json())
      .then(d => setPersonas(d.personas || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }, [TENANT, days, domain, sort, order])

  const domainOptions = [
    { value: '', label: '全部领域' },
    { value: 'philosophy', label: '哲学' },
    { value: 'strategy', label: '战略' },
    { value: 'technology', label: '科技' },
    { value: 'investment', label: '投资' },
    { value: 'science', label: '科学' },
    { value: 'creativity', label: '创意' },
  ]

  const columns = [
    {
      title: '人物',
      key: 'persona',
      render: (_: unknown, r: PersonaStats) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar style={{ background: chartColors[0] }}>{r.persona_name?.charAt(0) || '?'}</Avatar>
          <div>
            <div style={{ color: textPrimary, fontWeight: 500 }}>{r.persona_name || r.persona_id}</div>
            <div style={{ color: textSecondary, fontSize: 11 }}>{r.persona_id}</div>
          </div>
        </div>
      ),
    },
    {
      title: '领域',
      dataIndex: 'domain',
      key: 'domain',
      render: (d: string) => d ? <Tag color="blue">{d}</Tag> : <Tag>未分类</Tag>,
    },
    {
      title: (
        <span
          style={{ color: sort === 'views' ? chartColors[0] : textSecondary, cursor: 'pointer' }}
          onClick={() => { setSort('views'); setOrder(order === 'asc' ? 'desc' : 'asc'); }}
        >
          浏览数 {sort === 'views' ? (order === 'desc' ? '↓' : '↑') : ''}
        </span>
      ),
      dataIndex: 'views',
      key: 'views',
      render: (v: number) => <span style={{ color: chartColors[0], fontWeight: 600, fontSize: 15 }}>{v}</span>,
    },
    {
      title: (
        <span
          style={{ color: sort === 'conversations' ? chartColors[1] : textSecondary, cursor: 'pointer' }}
          onClick={() => { setSort('conversations'); setOrder(order === 'asc' ? 'desc' : 'asc'); }}
        >
          对话数 {sort === 'conversations' ? (order === 'desc' ? '↓' : '↑') : ''}
        </span>
      ),
      dataIndex: 'conversations',
      key: 'conversations',
      render: (v: number) => <span style={{ color: chartColors[1], fontWeight: 600 }}>{v}</span>,
    },
    {
      title: '平均轮次',
      dataIndex: 'avgTurns',
      key: 'avgTurns',
      render: (v: number) => <span style={{ color: textPrimary }}>{v.toFixed(1)} 轮</span>,
    },
    {
      title: (
        <span
          style={{ color: sort === 'graphClicks' ? chartColors[2] : textSecondary, cursor: 'pointer' }}
          onClick={() => { setSort('graph_clicks'); setOrder(order === 'asc' ? 'desc' : 'asc'); }}
        >
          图谱点击 {sort === 'graphClicks' ? (order === 'desc' ? '↓' : '↑') : ''}
        </span>
      ),
      dataIndex: 'graphClicks',
      key: 'graphClicks',
      render: (v: number) => <span style={{ color: chartColors[2], fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '热度指标',
      key: 'heat',
      render: (_: unknown, r: PersonaStats) => {
        const score = Math.min(100, Math.round((r.views * 1 + r.conversations * 5 + r.graphClicks * 2) / Math.max(r.views, 1) * 10))
        return <Progress percent={score} size="small" strokeColor={chartColors[0]} showInfo={false} />
      },
    },
  ]

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" tip="加载人物数据..." /></div>
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>
          人物热度分析
          <Tag color="purple" style={{ marginLeft: 12 }}>Prismatic</Tag>
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Select
            value={days}
            onChange={(v) => setDays(v)}
            style={{ width: 130 }}
            options={[
              { value: 7, label: '最近 7 天' },
              { value: 30, label: '最近 30 天' },
              { value: 90, label: '最近 90 天' },
            ]}
          />
          <Select
            value={domain || ''}
            onChange={(v) => setDomain(v || undefined)}
            style={{ width: 120 }}
            options={domainOptions}
          />
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card hoverable bodyStyle={{ padding: '16px', textAlign: 'center', background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}>
            <div style={{ color: '#fff' }}>
              <div style={{ opacity: 0.85, fontSize: 12 }}>人物总数</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{personas.length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable bodyStyle={{ padding: '16px', textAlign: 'center', background: 'linear-gradient(135deg, #f093fb, #f5576c)', border: 'none' }}>
            <div style={{ color: '#fff' }}>
              <div style={{ opacity: 0.85, fontSize: 12 }}>总浏览量</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{personas.reduce((s, p) => s + p.views, 0)}</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable bodyStyle={{ padding: '16px', textAlign: 'center', background: 'linear-gradient(135deg, #4facfe, #00f2fe)', border: 'none' }}>
            <div style={{ color: '#fff' }}>
              <div style={{ opacity: 0.85, fontSize: 12 }}>总对话数</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{personas.reduce((s, p) => s + p.conversations, 0)}</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable bodyStyle={{ padding: '16px', textAlign: 'center', background: 'linear-gradient(135deg, #43e97b, #38f9d7)', border: 'none' }}>
            <div style={{ color: '#333' }}>
              <div style={{ opacity: 0.75, fontSize: 12 }}>总图谱点击</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{personas.reduce((s, p) => s + p.graphClicks, 0)}</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title={<span style={{ color: textPrimary }}>人物热度排行</span>} style={{ background: cardBg }}>
        {personas.length > 0 ? (
          <Table
            dataSource={personas}
            rowKey="persona_id"
            columns={columns}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            size="middle"
          />
        ) : (
          <Empty description="暂无人物数据，请确保已集成 Prismatic 追踪脚本" />
        )}
      </Card>
    </div>
  )
}

export default function PersonasPage() {
  return (
    <Suspense fallback={<div style={{ padding: 50, textAlign: 'center' }}><Spin tip="加载中..." /></div>}>
      <PersonasPageWithSuspense />
    </Suspense>
  )
}
