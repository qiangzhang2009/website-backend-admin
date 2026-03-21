/**
 * 线索评分与分配系统
 * 多彩渐变设计风格
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Tag, Button, Space, Progress, Tooltip, Avatar, Spin, Empty } from 'antd'
import { ThunderboltOutlined, ReloadOutlined, ExportOutlined } from '@ant-design/icons'
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

// 多彩等级卡片配置
const LEVEL_CARDS = [
  { level: 'A', label: 'A级线索', subLabel: '80-100分', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#ef4444' },
  { level: 'B', label: 'B级线索', subLabel: '60-79分', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#f59e0b' },
  { level: 'C', label: 'C级线索', subLabel: '40-59分', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#3b82f6' },
  { level: 'D', label: 'D级线索', subLabel: '0-39分', gradient: 'linear-gradient(135deg, #6b7280, #4b5563)', color: '#6b7280' },
]

const scoreConfig = {
  behavior: { label: '行为维度', weight: 40, factors: [{ key: 'visit_frequency', label: '访问频次' }, { key: 'tool_usage', label: '工具使用深度' }, { key: 'form_completion', label: '表单完成度' }] },
  profile: { label: '画像维度', weight: 30, factors: [{ key: 'industry_match', label: '行业匹配度' }, { key: 'budget_level', label: '预算水平' }] },
  engagement: { label: '互动维度', weight: 30, factors: [{ key: 'inquiry_count', label: '询盘次数' }, { key: 'recency', label: '最近互动' }] },
}

const salesTeam = [
  { id: '1', name: '张强', load: 0, capacity: 10, specialty: ['日本市场', '保健食品'], gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
  { id: '2', name: '李静', load: 0, capacity: 10, specialty: ['东南亚', '中成药'], gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
  { id: '3', name: '刘潇', load: 0, capacity: 10, specialty: ['欧洲', '医疗器械'], gradient: 'linear-gradient(135deg, #10b981, #059669)' },
]

export default function LeadScoringPage() {
  const TENANT = useTenantFromURL()
  const { textSecondary, textMuted, infoColor, successColor, errorColor, warningColor, textPrimary } = useTheme()
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
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 }}>
            {r.name?.[0] || '?'}
          </div>
          <div>
            <div style={{ color: textPrimary }}>{r.name}</div>
            <div style={{ fontSize: 12, color: textMuted }}>{r.company}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '产品/市场',
      key: 'product',
      render: (_: unknown, r: Lead) => (
        <Space direction="vertical" size={0}>
          {r.product !== '-' && <Tag color="purple">{r.product}</Tag>}
          {r.market !== '-' && <Tag color="cyan">{r.market}</Tag>}
        </Space>
      ),
    },
    {
      title: '评分',
      key: 'score',
      sorter: (a: Lead, b: Lead) => a.score - b.score,
      render: (_: unknown, r: Lead) => (
        <Tooltip title={`访问${r.visitCount}次 · 询盘${r.inquiryCount}次 · 工具${r.toolCount}次`}>
          <Progress type="circle" percent={r.score} size={50} strokeColor={r.score >= 80 ? successColor : r.score >= 60 ? infoColor : r.score >= 40 ? warningColor : errorColor} />
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
          <span>访问 <span style={{ color: '#06b6d4', fontWeight: 500 }}>{r.visitCount}</span> 次</span>
          <span>工具 <span style={{ color: '#8b5cf6', fontWeight: 500 }}>{r.toolCount}</span> 次</span>
          <span>询盘 <span style={{ color: '#10b981', fontWeight: 500 }}>{r.inquiryCount}</span> 次</span>
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
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>线索评分与分配</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchLeads(1)}>重新计算</Button>
          <Button icon={<ThunderboltOutlined />} type="primary">自动分配</Button>
          <Button icon={<ExportOutlined />} onClick={() => { const url = `/api/admin/export?tenant=${TENANT}&type=leads`; window.open(url, '_blank') }}>导出</Button>
        </Space>
      </div>

      {/* 多彩等级卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {LEVEL_CARDS.map(card => {
          const count = levelStats[card.level as keyof LevelStats] || 0
          return (
            <Col xs={12} sm={6} key={card.level}>
              <Card hoverable style={{ background: card.gradient, border: 'none' }} bodyStyle={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ color: '#fff' }}>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{count}</div>
                  <div style={{ opacity: 0.9, fontSize: 12 }}>{card.label}</div>
                  <div style={{ opacity: 0.7, fontSize: 11 }}>{card.subLabel}</div>
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      <Card title={<span style={{ color: textPrimary }}>评分因素权重配置</span>} style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          {Object.entries(scoreConfig).map(([key, config]) => (
            <Col xs={24} md={8} key={key}>
              <Card size="small" title={<span style={{ color: textPrimary }}>{config.label}</span>} extra={<span style={{ color: '#8b5cf6' }}>权重: {config.weight}%</span>}>
                {config.factors.map(f => (
                  <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: textSecondary }}>{f.label}</span>
                    <span style={{ color: textMuted, fontSize: 12 }}>动态计算</span>
                  </div>
                ))}
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card title={<span style={{ color: textPrimary }}>线索列表</span>} style={{ marginBottom: 24 }}>
        {leads.length > 0 ? (
          <Table 
            columns={columns} 
            dataSource={leads} 
            rowKey="id" 
            pagination={{ 
              current: page, 
              pageSize, 
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total: number) => `共 ${total} 条线索`,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: (p) => { setPage(p); fetchLeads(p) }
            }} 
          />
        ) : (
          <Empty description="暂无线索数据" />
        )}
      </Card>

      <Card title={<span style={{ color: textPrimary }}>销售团队负载</span>}>
        <Row gutter={[16, 16]}>
          {salesTeam.map(member => (
            <Col xs={24} md={8} key={member.id}>
              <Card hoverable style={{ background: member.gradient, border: 'none' }} bodyStyle={{ padding: '16px' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <Avatar style={{ background: 'rgba(255,255,255,0.2)' }}>{member.name[0]}</Avatar>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600 }}>{member.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{member.load}/{member.capacity} 线索</div>
                    </div>
                  </Space>
                  <Progress type="circle" percent={member.load / member.capacity * 100} size={50} strokeColor="#fff" trailColor="rgba(255,255,255,0.3)" />
                </Space>
                <div style={{ marginTop: 12 }}>
                  <Space>{member.specialty.map(s => <Tag key={s} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>{s}</Tag>)}</Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  )
}
