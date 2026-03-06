/**
 * 线索评分与自动分配系统 - 真实数据版
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Tag, Button, Space, Progress, Tooltip, Badge, Avatar, Spin, Empty } from 'antd'
import { ThunderboltOutlined, ReloadOutlined, ExportOutlined } from '@ant-design/icons'
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

interface Lead {
  id: string
  name: string
  company: string
  phone: string | null
  email: string | null
  product: string
  market: string
  score: number
  level: string
  visitCount: number
  inquiryCount: number
  toolCount: number
  completedCount: number
  lastVisit: string | null
  createdAt: string
}

interface LevelStats { A: number; B: number; C: number; D: number }

const scoreConfig = {
  behavior: {
    label: '行为维度', weight: 40,
    factors: [
      { key: 'visit_frequency', label: '访问频次' },
      { key: 'tool_usage', label: '工具使用深度' },
      { key: 'form_completion', label: '表单完成度' },
    ],
  },
  profile: {
    label: '画像维度', weight: 30,
    factors: [
      { key: 'industry_match', label: '行业匹配度' },
      { key: 'budget_level', label: '预算水平' },
    ],
  },
  engagement: {
    label: '互动维度', weight: 30,
    factors: [
      { key: 'inquiry_count', label: '询盘次数' },
      { key: 'recency', label: '最近互动' },
    ],
  },
}

const salesTeam = [
  { id: '1', name: '张强', load: 0, capacity: 10, specialty: ['日本市场', '保健食品'] },
  { id: '2', name: '李静', load: 0, capacity: 10, specialty: ['东南亚', '中成药'] },
  { id: '3', name: '刘潇', load: 0, capacity: 10, specialty: ['欧洲', '医疗器械'] },
]

export default function LeadScoringPage() {
  const TENANT = useTenantFromURL()
  const [leads, setLeads] = useState<Lead[]>([])
  const [levelStats, setLevelStats] = useState<LevelStats>({ A: 0, B: 0, C: 0, D: 0 })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  const fetchLeads = async (pg = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/leads?tenant=${TENANT}&limit=${pageSize}&offset=${(pg - 1) * pageSize}`)
      const data = await res.json()
      setLeads(data.leads ?? [])
      setTotal(data.total ?? 0)
      setLevelStats(data.levelStats ?? { A: 0, B: 0, C: 0, D: 0 })
    } catch (e) {
      console.error('Leads fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (TENANT) fetchLeads()
  }, [TENANT])

  const columns = [
    {
      title: '线索',
      key: 'lead',
      render: (_: unknown, r: Lead) => (
        <Space>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#1890ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 600,
          }}>
            {r.name?.[0] || '?'}
          </div>
          <div>
            <div>{r.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{r.company}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '产品/市场',
      key: 'product',
      render: (_: unknown, r: Lead) => (
        <Space direction="vertical" size={0}>
          {r.product !== '-' && <Tag>{r.product}</Tag>}
          {r.market !== '-' && <Tag color="blue">{r.market}</Tag>}
        </Space>
      ),
    },
    {
      title: '评分',
      key: 'score',
      sorter: (a: Lead, b: Lead) => a.score - b.score,
      render: (_: unknown, r: Lead) => (
        <Tooltip title={`访问${r.visitCount}次 · 询盘${r.inquiryCount}次 · 使用工具${r.toolCount}次`}>
          <Progress
            type="circle"
            percent={r.score}
            size={50}
            strokeColor={r.score >= 80 ? '#52c41a' : r.score >= 60 ? '#1890ff' : r.score >= 40 ? '#faad14' : '#ff4d4f'}
          />
        </Tooltip>
      ),
    },
    {
      title: '等级',
      dataIndex: 'level',
      render: (level: string) => {
        const colorMap: Record<string, string> = { A: 'red', B: 'orange', C: 'blue', D: 'default' }
        return <Tag color={colorMap[level]}>{level}级</Tag>
      },
    },
    {
      title: '行为数据',
      key: 'behavior',
      render: (_: unknown, r: Lead) => (
        <Space direction="vertical" size={0} style={{ fontSize: 12 }}>
          <span>访问 {r.visitCount} 次</span>
          <span>工具 {r.toolCount} 次</span>
          <span>询盘 {r.inquiryCount} 次</span>
        </Space>
      ),
    },
    {
      title: '最近活跃',
      dataIndex: 'lastVisit',
      render: (v: string | null) => v ? dayjs(v).fromNow() : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space>
          <Button type="link" size="small">查看</Button>
          <Button type="link" size="small">分配</Button>
        </Space>
      ),
    },
  ]

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" /></div>
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>线索评分与分配</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchLeads(1)}>重新计算</Button>
          <Button icon={<ThunderboltOutlined />} type="primary">自动分配</Button>
          <Button icon={<ExportOutlined />}>导出</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {[
          { level: 'A', label: 'A级 (80-100分)', color: '#52c41a', count: levelStats.A },
          { level: 'B', label: 'B级 (60-79分)', color: '#1890ff', count: levelStats.B },
          { level: 'C', label: 'C级 (40-59分)', color: '#faad14', count: levelStats.C },
          { level: 'D', label: 'D级 (0-39分)', color: '#999', count: levelStats.D },
        ].map(item => (
          <Col xs={6} key={item.level}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, color: item.color, fontWeight: 'bold' }}>{item.count}</div>
                <div style={{ fontSize: 12 }}>{item.label}</div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="评分因素权重配置" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          {Object.entries(scoreConfig).map(([key, config]) => (
            <Col xs={24} md={8} key={key}>
              <Card size="small" title={config.label} extra={`权重: ${config.weight}%`}>
                {config.factors.map(f => (
                  <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>{f.label}</span>
                    <span style={{ color: '#888' }}>动态计算</span>
                  </div>
                ))}
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        {leads.length > 0 ? (
          <Table
            columns={columns}
            dataSource={leads}
            rowKey="id"
            pagination={{ current: page, pageSize, total, onChange: (p) => { setPage(p); fetchLeads(p) } }}
          />
        ) : (
          <Empty description="暂无线索数据，等待用户访问网站后自动计算评分" />
        )}
      </Card>

      <Card title="销售团队负载" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          {salesTeam.map(member => (
            <Col xs={24} md={8} key={member.id}>
              <Card size="small">
                <Space>
                  <Avatar>{member.name[0]}</Avatar>
                  <div style={{ flex: 1 }}>
                    <div>{member.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{member.load}/{member.capacity} 线索</div>
                  </div>
                  <Progress type="circle" percent={member.load / member.capacity * 100} size={50} strokeColor="#52c41a" />
                </Space>
                <div style={{ marginTop: 8 }}>
                  <Space>{member.specialty.map(s => <Tag key={s} color="blue" style={{ fontSize: 10 }}>{s}</Tag>)}</Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  )
}
