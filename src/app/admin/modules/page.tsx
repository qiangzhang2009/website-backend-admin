/**
 * 模块使用分析页面
 * 使用 Ant Design 组件，支持深色主题
 */

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, Row, Col, Table, Tag, Button, Space, Progress, Spin, Statistic, Tabs } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useTheme } from '@/components/AdminLayout'

interface ModuleStat {
  module: string
  total: number
  completed: number
  abandoned: number
  avgTime: string
  completionRate: number
}

interface ModuleUsage {
  module_id: string
  module_name: string
  event_type: string
  duration_seconds: number
  conversation_turns: number
  created_at: string
}

const MODULE_NAMES: Record<string, string> = {
  bazi: '八字分析',
  fengshui: '风水布局',
  tarot: '塔罗牌',
  palm: '手相',
  dream: '周公解梦',
  zodiac: '星座运势',
  mbti: 'MBTI测试',
  draw: '抽签',
  huangdi: '黄帝内经',
  lifenumber: '生命灵数',
  ziwei: '紫微斗数',
  zhouyi: '周易',
  naming: '起名',
  marriage: '婚配',
  company: '公司起名',
  luckyday: '吉日',
  digital: '数字命理',
  daodejing: '道德经',
  question: '问卦',
  market: '市场选择器',
  cost: '成本计算器',
  policy: '政策查询',
  decision: '决策工作台',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  start: '开始',
  input: '输入',
  output: '输出',
  complete: '完成',
  abandon: '放弃',
  tool_start: '开始',
  tool_input: '输入',
  tool_output: '输出',
  tool_complete: '完成',
  tool_abandon: '放弃',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  start: 'green',
  input: 'blue',
  output: 'purple',
  complete: 'green',
  abandon: 'red',
  tool_start: 'green',
  tool_input: 'blue',
  tool_output: 'purple',
  tool_complete: 'green',
  tool_abandon: 'red',
}

export default function ModulesPage() {
  const searchParams = useSearchParams()
  const tenant = searchParams.get('tenant') || 'zxqconsulting'
  const { isDark, textPrimary, textSecondary, textMuted, successColor, errorColor, warningColor, infoColor, cardBg } = useTheme()
  
  const [stats, setStats] = useState<Record<string, ModuleStat>>({})
  const [recentUsage, setRecentUsage] = useState<ModuleUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'stats' | 'usage'>('stats')

  useEffect(() => {
    fetchData()
  }, [tenant])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/modules?tenant=${tenant}`)
      const data = await res.json()
      
      if (data.stats) {
        setStats(data.stats)
      }
      if (data.data) {
        setRecentUsage(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch module data:', error)
    } finally {
      setLoading(false)
    }
  }

  const moduleList = Object.entries(stats).map(([module, stat]) => ({
    id: module,
    name: MODULE_NAMES[module] || module,
    ...stat,
  }))

  const totalUsage = Object.values(stats).reduce((sum, s) => sum + s.total, 0)
  const totalCompleted = Object.values(stats).reduce((sum, s) => sum + s.completed, 0)
  const avgCompletionRate = totalUsage > 0 ? ((totalCompleted / totalUsage) * 100).toFixed(1) : '0'

  const statColumns = [
    {
      title: '模块',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 500, color: textPrimary }}>{text}</span>,
    },
    {
      title: '使用次数',
      dataIndex: 'total',
      key: 'total',
      render: (v: number) => <span style={{ color: infoColor, fontWeight: 600 }}>{v}</span>,
    },
    {
      title: '完成',
      dataIndex: 'completed',
      key: 'completed',
      render: (v: number, r: ModuleStat) => (
        <span style={{ color: successColor }}>{v} ({r.total > 0 ? Math.round(v / r.total * 100) : 0}%)</span>
      ),
    },
    {
      title: '放弃',
      dataIndex: 'abandoned',
      key: 'abandoned',
      render: (v: number, r: ModuleStat) => (
        <span style={{ color: errorColor }}>{v} ({r.total > 0 ? Math.round(v / r.total * 100) : 0}%)</span>
      ),
    },
    {
      title: '平均时长',
      dataIndex: 'avgTime',
      key: 'avgTime',
      render: (v: string) => <span style={{ color: textSecondary }}>{v}</span>,
    },
    {
      title: '完成率',
      dataIndex: 'completionRate',
      key: 'completionRate',
      render: (v: number) => {
        let color: 'green' | 'orange' | 'red' = 'green'
        if (v < 40) color = 'red'
        else if (v < 70) color = 'orange'
        return <Tag color={color}>{v}%</Tag>
      },
    },
    {
      title: '热度',
      dataIndex: 'total',
      key: 'heat',
      render: (v: number) => {
        const max = moduleList[0]?.total || 1
        const percent = max > 0 ? (v / max) * 100 : 0
        return (
          <div style={{ width: 80 }}>
            <Progress percent={percent} showInfo={false} strokeColor={infoColor} trailColor={isDark ? '#374151' : '#e5e7eb'} size="small" />
          </div>
        )
      },
    },
  ]

  const usageColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => <span style={{ color: textSecondary }}>{new Date(v).toLocaleString()}</span>,
    },
    {
      title: '模块',
      dataIndex: 'module_id',
      key: 'module_id',
      render: (v: string) => <span style={{ color: textPrimary, fontWeight: 500 }}>{MODULE_NAMES[v] || v}</span>,
    },
    {
      title: '事件类型',
      dataIndex: 'event_type',
      key: 'event_type',
      render: (v: string) => <Tag color={EVENT_TYPE_COLORS[v] || 'default'}>{EVENT_TYPE_LABELS[v] || v}</Tag>,
    },
    {
      title: '时长(秒)',
      dataIndex: 'duration_seconds',
      key: 'duration_seconds',
      render: (v: number) => <span style={{ color: textSecondary }}>{v || '-'}</span>,
    },
    {
      title: '对话轮次',
      dataIndex: 'conversation_turns',
      key: 'conversation_turns',
      render: (v: number) => <span style={{ color: textSecondary }}>{v || '-'}</span>,
    },
  ]

  const tabItems = [
    {
      key: 'stats',
      label: '统计概览',
      children: (
        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : moduleList.length > 0 ? (
            <Table
              dataSource={moduleList.sort((a, b) => b.total - a.total)}
              rowKey="id"
              pagination={false}
              columns={statColumns}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: textMuted }}>
              暂无模块使用数据，等待用户与工具交互后自动记录
            </div>
          )}
        </Card>
      ),
    },
    {
      key: 'usage',
      label: '使用记录',
      children: (
        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : recentUsage.length > 0 ? (
            <Table
              dataSource={recentUsage.slice(0, 50)}
              rowKey="created_at"
              pagination={false}
              columns={usageColumns}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: textMuted }}>
              暂无使用记录
            </div>
          )}
        </Card>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary }}>模块使用分析</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新数据</Button>
      </div>

      {/* 统计概览卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic 
              title={<span style={{ color: textSecondary }}>总使用次数</span>} 
              value={totalUsage} 
              valueStyle={{ color: infoColor }} 
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic 
              title={<span style={{ color: textSecondary }}>活跃模块数</span>} 
              value={moduleList.length} 
              valueStyle={{ color: successColor }} 
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic 
              title={<span style={{ color: textSecondary }}>完成次数</span>} 
              value={totalCompleted} 
              valueStyle={{ color: warningColor }} 
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic 
              title={<span style={{ color: textSecondary }}>平均完成率</span>} 
              value={parseFloat(avgCompletionRate)} 
              suffix="%"
              valueStyle={{ color: chartColors[5] }} 
            />
          </Card>
        </Col>
      </Row>

      {/* Tab 切换 */}
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as any)} items={tabItems} />
    </div>
  )
}

// 临时定义 chartColors，因为上面没用上
const chartColors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#22c55e', '#f97316']
