/**
 * 线索评分与自动分配系统
 * 自动评分线索质量，智能分配给销售
 */

'use client'

import { Card, Row, Col, Table, Tag, Button, Space, Progress, Tooltip, Badge, Avatar } from 'antd'
import { ThunderboltOutlined, ReloadOutlined, ExportOutlined } from '@ant-design/icons'

// 模拟线索评分数据
const mockLeads = [
  {
    id: '1',
    name: '王建国',
    company: '浙江医药集团',
    phone: '138****1234',
    product: '保健食品',
    market: '日本',
    score: 92,
    level: 'A级',
    factors: { behavior: 95, profile: 88, engagement: 90 },
    assignee: '张强',
    status: 'unassigned',
    createdAt: '2026-03-05',
  },
  {
    id: '2',
    name: '李明华',
    company: '广东中药厂',
    phone: '139****5678',
    product: '中成药',
    market: '东南亚',
    score: 78,
    level: 'B级',
    factors: { behavior: 80, profile: 75, engagement: 78 },
    assignee: '李静',
    status: 'assigned',
    createdAt: '2026-03-04',
  },
  {
    id: '3',
    name: '张小芳',
    company: '上海医疗器械',
    phone: '136****9012',
    product: '医疗器械',
    market: '欧洲',
    score: 65,
    level: 'C级',
    factors: { behavior: 60, profile: 70, engagement: 65 },
    assignee: null,
    status: 'unassigned',
    createdAt: '2026-03-03',
  },
  {
    id: '4',
    name: '刘强',
    company: '广州化妆品公司',
    phone: '137****3456',
    product: '化妆品',
    market: '澳大利亚',
    score: 45,
    level: 'D级',
    factors: { behavior: 40, profile: 50, engagement: 45 },
    assignee: null,
    status: 'ignored',
    createdAt: '2026-03-02',
  },
  {
    id: '5',
    name: '陈先生',
    company: '江苏贸易公司',
    phone: '135****7890',
    product: '普通食品',
    market: '日本',
    score: 88,
    level: 'A级',
    factors: { behavior: 90, profile: 85, engagement: 88 },
    assignee: '张强',
    status: 'assigned',
    createdAt: '2026-03-01',
  },
]

// 评分因素配置
const scoreConfig = {
  behavior: {
    label: '行为维度',
    weight: 40,
    factors: [
      { key: 'visit_frequency', label: '访问频次', maxScore: 100 },
      { key: 'tool_usage', label: '工具使用深度', maxScore: 100 },
      { key: 'content_interaction', label: '内容互动', maxScore: 100 },
      { key: 'form_completion', label: '表单完成度', maxScore: 100 },
    ]
  },
  profile: {
    label: '画像维度',
    weight: 30,
    factors: [
      { key: 'company_size', label: '公司规模', maxScore: 100 },
      { key: 'industry_match', label: '行业匹配度', maxScore: 100 },
      { key: 'budget_level', label: '预算水平', maxScore: 100 },
      { key: 'decision_maker', label: '决策人身份', maxScore: 100 },
    ]
  },
  engagement: {
    label: '互动维度',
    weight: 30,
    factors: [
      { key: 'inquiry_count', label: '询盘次数', maxScore: 100 },
      { key: 'response_rate', label: '响应率', maxScore: 100 },
      { key: 'recency', label: '最近互动', maxScore: 100 },
    ]
  }
}

// 销售团队
const salesTeam = [
  { id: '1', name: '张强', avatar: null, load: 8, capacity: 10, specialty: ['日本市场', '保健食品'] },
  { id: '2', name: '李静', avatar: null, load: 5, capacity: 10, specialty: ['东南亚', '中成药'] },
  { id: '3', name: '刘潇', avatar: null, load: 3, capacity: 10, specialty: ['欧洲', '医疗器械'] },
]

// 模拟自动分配规则
const autoAssignRules = [
  { id: '1', name: '按地区分配', enabled: true, description: '根据目标市场分配给对应专人' },
  { id: '2', name: '负载均衡', enabled: true, description: '优先分配给负载较低的銷售' },
  { id: '3', name: '轮询分配', enabled: false, description: '按顺序轮流分配给所有销售' },
  { id: '4', name: '自动升级', enabled: true, description: 'A级线索自动提醒销售优先处理' },
]

type LeadRecord = typeof mockLeads[0]

const columns = [
  {
    title: '线索',
    key: 'lead',
    render: (_: unknown, r: LeadRecord) => (
      <Space>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 }}>{r.name[0]}</div>
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
    render: (_: unknown, r: LeadRecord) => (
      <Space direction="vertical" size={0}>
        <Tag>{r.product}</Tag>
        <Tag color="blue">{r.market}</Tag>
      </Space>
    ),
  },
  {
    title: '评分',
    key: 'score',
    sorter: (a: LeadRecord, b: LeadRecord) => a.score - b.score,
    render: (_: unknown, r: LeadRecord) => (
      <div>
        <Progress 
          type="circle" 
          percent={r.score} 
          size={50}
          strokeColor={r.score >= 80 ? '#52c41a' : r.score >= 60 ? '#1890ff' : r.score >= 40 ? '#faad14' : '#ff4d4f'}
        />
      </div>
    ),
  },
  {
    title: '等级',
    dataIndex: 'level',
    render: (level: string) => {
      const colorMap: Record<string, string> = { 'A级': 'red', 'B级': 'orange', 'C级': 'blue', 'D级': 'default' }
      return <Tag color={colorMap[level]}>{level}级</Tag>
    },
  },
  {
    title: '评分因素',
    key: 'factors',
    render: (_: unknown, r: LeadRecord) => (
      <Tooltip title={`行为:${r.factors.behavior} 画像:${r.factors.profile} 互动:${r.factors.engagement}`}>
        <Progress percent={r.factors.behavior} size="small" strokeColor="#1890ff" style={{ width: 60 }} />
      </Tooltip>
    ),
  },
  {
    title: '负责人',
    dataIndex: 'assignee',
    render: (a: string) => a || <Badge status="default" text="未分配" />,
  },
  {
    title: '状态',
    dataIndex: 'status',
    render: (s: string) => {
      const map: Record<string, { color: string; text: string }> = {
        unassigned: { color: 'orange', text: '待分配' },
        assigned: { color: 'green', text: '已分配' },
        ignored: { color: 'default', text: '已忽略' },
      }
      return <Tag color={map[s]?.color}>{map[s]?.text}</Tag>
    },
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
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

export default function LeadScoringPage() {
  const levelStats = {
    A: mockLeads.filter(l => l.level === 'A级').length,
    B: mockLeads.filter(l => l.level === 'B级').length,
    C: mockLeads.filter(l => l.level === 'C级').length,
    D: mockLeads.filter(l => l.level === 'D级').length,
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>线索评分与分配</h2>
        <Space>
          <Button icon={<ReloadOutlined />}>重新计算</Button>
          <Button icon={<ThunderboltOutlined />} type="primary">自动分配</Button>
          <Button icon={<ExportOutlined />}>导出</Button>
        </Space>
      </div>

      {/* 评分统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, color: '#52c41a', fontWeight: 'bold' }}>{levelStats.A}</div>
              <div>A级 (80-100分)</div>
            </div>
          </Card>
        </Col>
        <Col xs={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, color: '#1890ff', fontWeight: 'bold' }}>{levelStats.B}</div>
              <div>B级 (60-79分)</div>
            </div>
          </Card>
        </Col>
        <Col xs={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, color: '#faad14', fontWeight: 'bold' }}>{levelStats.C}</div>
              <div>C级 (40-59分)</div>
            </div>
          </Card>
        </Col>
        <Col xs={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, color: '#999', fontWeight: 'bold' }}>{levelStats.D}</div>
              <div>D级 (0-39分)</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 评分因素配置 */}
      <Card title="评分因素权重配置" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          {Object.entries(scoreConfig).map(([key, config]) => (
            <Col xs={24} md={8} key={key}>
              <Card size="small" title={config.label} extra={`权重: ${config.weight}%`}>
                {config.factors.map(f => (
                  <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>{f.label}</span>
                    <span style={{ color: '#888' }}>{f.maxScore}分</span>
                  </div>
                ))}
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 线索列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={mockLeads}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 销售团队负载 */}
      <Card title="销售团队负载" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          {salesTeam.map(member => (
            <Col xs={24} md={8} key={member.id}>
              <Card size="small">
                <Space>
                  <Avatar>{member.name[0]}</Avatar>
                  <div style={{ flex: 1 }}>
                    <div>{member.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {member.load}/{member.capacity} 线索
                    </div>
                  </div>
                  <Progress 
                    type="circle" 
                    percent={member.load / member.capacity * 100} 
                    size={50}
                    strokeColor={member.load / member.capacity > 0.8 ? '#ff4d4f' : '#52c41a'}
                  />
                </Space>
                <div style={{ marginTop: 8 }}>
                  <Space>
                    {member.specialty.map(s => (
                      <Tag key={s} color="blue" style={{ fontSize: 10 }}>{s}</Tag>
                    ))}
                  </Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 自动分配规则 */}
      <Card title="自动分配规则" style={{ marginTop: 16 }}>
        {autoAssignRules.map(rule => (
          <div key={rule.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <div style={{ fontWeight: 500 }}>{rule.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{rule.description}</div>
            </div>
            <Button type={rule.enabled ? 'primary' : 'default'} size="small">
              {rule.enabled ? '已启用' : '已禁用'}
            </Button>
          </div>
        ))}
      </Card>
    </div>
  )
}
