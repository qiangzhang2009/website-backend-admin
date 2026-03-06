/**
 * 360°用户画像页面
 * 展示用户完整画像：基本信息、行为轨迹、意向分析、标签体系
 */

'use client'

import { useState } from 'react'
import { Card, Row, Col, Descriptions, Tag, Timeline, Table, Progress, Space, Button, Tabs, Statistic } from 'antd'
import { UserOutlined, BankOutlined, GlobalOutlined, ToolOutlined, CustomerServiceOutlined, MessageOutlined } from '@ant-design/icons'
import { Radar } from '@ant-design/charts'

// 模拟用户画像数据
const mockProfile = {
  id: '1',
  name: '王建国',
  avatar: null,
  gender: '男',
  age: '45岁',
  phone: '138****1234',
  email: 'wang@pharma.com',
  wechat: 'wang1381234',
  company: '浙江医药集团',
  position: '总经理',
  industry: '医药行业',
  employeeCount: '500-1000人',
  annualRevenue: '5-10亿',
  address: '浙江省杭州市',
  
  // 业务信息
  productType: '保健食品',
  targetMarket: '日本',
  budget: '150-300万',
  timeline: '6个月内',
  decisionMaker: true,
  
  // 意向度
  intentScore: 85,
  intentLevel: '高意向',
  
  // 行为统计
  visitCount: 28,
  toolUsageCount: 45,
  pageViews: 156,
  avgSessionDuration: '8分25秒',
  firstVisit: '2025-12-15',
  lastVisit: '2026-03-05',
  daysActive: 85,
  
  // 来源信息
  source: '搜索引擎',
  sourceDetail: 'Google',
  utmCampaign: 'spring_promo',
  
  // 询盘记录
  inquiryCount: 3,
  lastInquiry: '2026-03-01',
  totalInquiryValue: '约200万',
}

// 访问轨迹
const mockVisitHistory = [
  { time: '2026-03-05 14:30', action: '访问网站', page: '/tools/cost-calculator', duration: '5:23', device: '桌面' },
  { time: '2026-03-05 09:15', action: '使用工具', tool: '成本计算器', result: '提交', product: '保健食品', market: '日本' },
  { time: '2026-03-04 16:45', action: '访问网站', page: '/markets/japan', duration: '3:12', device: '桌面' },
  { time: '2026-03-04 11:20', action: '使用工具', tool: '时间估算', result: '提交', product: '保健食品', market: '日本' },
  { time: '2026-03-03 14:00', action: '提交询盘', form: '询盘表单', product: '保健食品', market: '日本' },
  { time: '2026-03-02 10:30', action: '使用工具', tool: '政策查询', result: '查询', product: '保健食品', market: '日本' },
  { time: '2026-03-01 15:20', action: '访问网站', page: '/services', duration: '4:45', device: '桌面' },
  { time: '2026-02-28 09:00', action: '注册', source: '自然流量' },
]

// 行为标签
const mockBehaviorTags = [
  { name: '多次访问', type: 'behavior', color: 'blue', count: 28 },
  { name: '工具深度用户', type: 'behavior', color: 'green', count: 45 },
  { name: '价格敏感', type: 'behavior', color: 'orange', count: 12 },
  { name: '决策者', type: 'behavior', color: 'red', count: 1 },
  { name: '保健食品专家', type: 'behavior', color: 'purple', count: 8 },
]

// 业务标签
const mockBusinessTags = [
  { name: '高意向', type: 'business', color: 'red', score: 85 },
  { name: '目标市场-日本', type: 'business', color: 'blue', score: 100 },
  { name: '保健食品', type: 'business', color: 'green', score: 95 },
  { name: '预算充足', type: 'business', color: 'gold', score: 80 },
  { name: '近期成交', type: 'business', color: 'purple', score: 75 },
]

// 雷达图数据
const mockRadarData = [
  { dimension: '访问频次', value: 90 },
  { dimension: '工具使用', value: 85 },
  { dimension: '表单互动', value: 95 },
  { dimension: '内容浏览', value: 70 },
  { dimension: '社交互动', value: 40 },
  { dimension: '询盘转化', value: 88 },
]

// 页面浏览记录
const mockPageViews = [
  { page: '/services', title: '服务介绍', pv: 45, avgTime: '3:25', lastVisit: '2026-03-01' },
  { page: '/tools/cost-calculator', title: '成本计算器', pv: 28, avgTime: '5:48', lastVisit: '2026-03-05' },
  { page: '/markets/japan', title: '日本市场', pv: 22, avgTime: '4:12', lastVisit: '2026-03-04' },
  { page: '/tools/time-estimation', title: '时间估算', pv: 18, avgTime: '3:55', lastVisit: '2026-03-04' },
  { page: '/contact', title: '联系我们', pv: 15, avgTime: '1:20', lastVisit: '2026-03-03' },
]

// 工具使用记录
const mockToolUsage = [
  { tool: '成本计算器', usageCount: 18, lastUse: '2026-03-05', avgDuration: '4:25', completionRate: 85 },
  { tool: '时间估算', usageCount: 12, lastUse: '2026-03-04', avgDuration: '3:15', completionRate: 92 },
  { tool: '政策查询', usageCount: 8, lastUse: '2026-03-02', avgDuration: '2:30', completionRate: 100 },
  { tool: 'ROI模拟', usageCount: 5, lastUse: '2026-02-28', avgDuration: '6:12', completionRate: 80 },
  { tool: '风险评估', usageCount: 2, lastUse: '2026-02-20', avgDuration: '8:00', completionRate: 50 },
]

// 询盘记录
const mockInquiries = [
  { id: '1', date: '2026-03-01', product: '保健食品', market: '日本', budget: '150万', status: 'following', value: '150万' },
  { id: '2', date: '2026-02-15', product: '保健食品', market: '日本', budget: '200万', status: 'completed', value: '200万' },
  { id: '3', date: '2026-01-20', product: '中成药', market: '东南亚', budget: '80万', status: 'failed', value: '-' },
]

const radarConfig = {
  data: mockRadarData,
  xField: 'dimension',
  yField: 'value',
  height: 250,
  color: '#1890ff',
  area: {},
}

type PageViewRow = typeof mockPageViews[0]

const pageColumns = [
  { title: '页面', dataIndex: 'page', key: 'page', render: (_: string, r: PageViewRow) => <a href={r.page}>{r.title}</a> },
  { title: '浏览量', dataIndex: 'pv', key: 'pv', sorter: (a: PageViewRow, b: PageViewRow) => a.pv - b.pv },
  { title: '平均停留', dataIndex: 'avgTime', key: 'avgTime' },
  { title: '最后访问', dataIndex: 'lastVisit', key: 'lastVisit' },
]

const toolColumns = [
  { title: '工具', dataIndex: 'tool', key: 'tool', render: (t: string) => <Tag color="blue">{t}</Tag> },
  { title: '使用次数', dataIndex: 'usageCount', key: 'usageCount' },
  { title: '最后使用', dataIndex: 'lastUse', key: 'lastUse' },
  { title: '平均用时', dataIndex: 'avgDuration', key: 'avgDuration' },
  { title: '完成率', dataIndex: 'completionRate', key: 'completionRate', render: (r: number) => <Progress percent={r} size="small" status={r > 80 ? 'success' : r > 60 ? 'normal' : 'exception'} /> },
]

const inquiryColumns = [
  { title: '时间', dataIndex: 'date', key: 'date' },
  { title: '产品', dataIndex: 'product', key: 'product' },
  { title: '目标市场', dataIndex: 'market', key: 'market' },
  { title: '预算', dataIndex: 'budget', key: 'budget' },
  { title: '预估价值', dataIndex: 'value', key: 'value' },
  { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => {
    const map: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: '待处理' },
      following: { color: 'blue', text: '跟进中' },
      completed: { color: 'green', text: '已成交' },
      failed: { color: 'red', text: '已流失' },
    }
    return <Tag color={map[s]?.color}>{map[s]?.text}</Tag>
  }},
]

export default function UserProfilePage() {
  const [activeTab, setActiveTab] = useState('overview')

  const items = [
    {
      key: 'overview',
      label: '画像概览',
      children: (
        <Row gutter={[16, 16]}>
          {/* 左侧：基本信息 */}
          <Col xs={24} lg={12}>
            <Card title="基本信息" style={{ marginBottom: 16 }}>
              <Descriptions column={1}>
                <Descriptions.Item label="姓名">{mockProfile.name}</Descriptions.Item>
                <Descriptions.Item label="公司">{mockProfile.company}</Descriptions.Item>
                <Descriptions.Item label="职位">{mockProfile.position}</Descriptions.Item>
                <Descriptions.Item label="行业">{mockProfile.industry}</Descriptions.Item>
                <Descriptions.Item label="规模">{mockProfile.employeeCount}</Descriptions.Item>
                <Descriptions.Item label="年营收">{mockProfile.annualRevenue}</Descriptions.Item>
                <Descriptions.Item label="地区">{mockProfile.address}</Descriptions.Item>
              </Descriptions>
            </Card>
            <Card title="联系方式">
              <Descriptions column={1}>
                <Descriptions.Item label="手机">{mockProfile.phone}</Descriptions.Item>
                <Descriptions.Item label="邮箱">{mockProfile.email}</Descriptions.Item>
                <Descriptions.Item label="微信">{mockProfile.wechat}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          
          {/* 右侧：意向度和行为 */}
          <Col xs={24} lg={12}>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Progress 
                  type="circle" 
                  percent={mockProfile.intentScore} 
                  size={160}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  format={percent => (
                    <div>
                      <div style={{ fontSize: 36, fontWeight: 'bold' }}>{percent}</div>
                      <div style={{ fontSize: 14, color: '#888' }}>意向评分</div>
                    </div>
                  )}
                />
                <div style={{ marginTop: 16 }}>
                  <Tag color="red" style={{ fontSize: 16, padding: '4px 12px' }}>{mockProfile.intentLevel}</Tag>
                </div>
              </div>
            </Card>
            <Card title="行为雷达">
              <Radar {...radarConfig} />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'behavior',
      label: '行为轨迹',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card title="访问轨迹">
              <Timeline
                items={mockVisitHistory.map(v => ({
                  color: v.action === '提交询盘' ? 'green' : v.action === '使用工具' ? 'blue' : 'gray',
                  children: (
                    <div>
                      <div>{v.time}</div>
                      <div style={{ color: '#1890ff' }}>{v.action}</div>
                      {v.page && <div>页面: {v.page} ({v.duration})</div>}
                      {v.tool && <div>工具: {v.tool} - {v.result}</div>}
                      {v.form && <div>表单: {v.form}</div>}
                      {v.device && <div>设备: {v.device}</div>}
                    </div>
                  ),
                }))}
              />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'pages',
      label: '页面浏览',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card>
              <Table dataSource={mockPageViews} columns={pageColumns} pagination={false} rowKey="page" />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'tools',
      label: '工具使用',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card>
              <Table dataSource={mockToolUsage} columns={toolColumns} pagination={false} rowKey="tool" />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'inquiries',
      label: '询盘记录',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card>
              <Table dataSource={mockInquiries} columns={inquiryColumns} pagination={false} rowKey="id" />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'tags',
      label: '标签体系',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="行为标签">
              <Space wrap>
                {mockBehaviorTags.map(tag => (
                  <Tag key={tag.name} color={tag.color}>
                    {tag.name} ({tag.count})
                  </Tag>
                ))}
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="业务标签">
              <Space wrap>
                {mockBusinessTags.map(tag => (
                  <Tag key={tag.name} color={tag.color}>
                    {tag.name}
                  </Tag>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>
      ),
    },
  ]

  return (
    <div>
      {/* 用户头部信息 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserOutlined style={{ fontSize: 36, color: '#fff' }} />
            </div>
          </Col>
          <Col flex={1}>
            <h2 style={{ margin: 0 }}>{mockProfile.name}</h2>
            <Space style={{ marginTop: 8 }}>
              <Tag icon={<BankOutlined />}>{mockProfile.company}</Tag>
              <Tag icon={<GlobalOutlined />}>{mockProfile.targetMarket}</Tag>
              <Tag color="red">{mockProfile.intentLevel}</Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<CustomerServiceOutlined />}>联系客户</Button>
              <Button icon={<ToolOutlined />}>发送资料</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 核心统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card>
            <Statistic title="访问次数" value={mockProfile.visitCount} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic title="工具使用" value={mockProfile.toolUsageCount} prefix={<ToolOutlined />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic title="询盘次数" value={mockProfile.inquiryCount} prefix={<MessageOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 标签页内容 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
      </Card>
    </div>
  )
}
