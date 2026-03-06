/**
 * 仪表盘页面
 * 展示核心数据指标和可视化图表
 */

'use client'

import { Card, Row, Col, Statistic, Table, Tag, Button, Space, DatePicker } from 'antd'
import {
  UserOutlined,
  MessageOutlined,
  RiseOutlined,
  EyeOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import { Line, Column, Pie } from '@ant-design/charts'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

// 模拟数据
const mockStats = {
  todayVisitors: 128,
  todayVisitorsChange: 12.5,
  totalUsers: 3652,
  totalUsersChange: 8.2,
  inquiries: 156,
  inquiriesChange: 15.3,
  conversionRate: 4.28,
  conversionRateChange: 2.1,
}

const mockRecentInquiries = [
  {
    key: '1',
    name: '王先生',
    company: '浙江某药业公司',
    product: '保健食品',
    market: '日本',
    status: 'pending',
    time: '10分钟前',
  },
  {
    key: '2',
    name: '李女士',
    company: '广东某中药厂',
    product: '中成药',
    market: '东南亚',
    status: 'following',
    time: '30分钟前',
  },
  {
    key: '3',
    name: '张总',
    company: '江苏某贸易公司',
    product: '医疗器械',
    market: '欧洲',
    status: 'completed',
    time: '1小时前',
  },
  {
    key: '4',
    name: '刘经理',
    company: '上海某科技公司',
    product: '化妆品',
    market: '澳大利亚',
    status: 'pending',
    time: '2小时前',
  },
]

const mockTrafficData = [
  { date: '2026-02-27', visitors: 98, pageViews: 342 },
  { date: '2026-02-28', visitors: 112, pageViews: 389 },
  { date: '2026-03-01', visitors: 105, pageViews: 356 },
  { date: '2026-03-02', visitors: 134, pageViews: 467 },
  { date: '2026-03-03', visitors: 98, pageViews: 312 },
  { date: '2026-03-04', visitors: 126, pageViews: 423 },
  { date: '2026-03-05', visitors: 128, pageViews: 445 },
]

const mockToolUsage = [
  { tool: '成本计算器', usage: 456, rate: 32.5 },
  { tool: '时间估算', usage: 312, rate: 22.2 },
  { tool: '政策查询', usage: 287, rate: 20.4 },
  { tool: 'ROI模拟', usage: 198, rate: 14.1 },
  { tool: '风险评估', usage: 156, rate: 11.1 },
]

const mockMarketDistribution = [
  { market: '日本', value: 35 },
  { market: '东南亚', value: 25 },
  { market: '澳大利亚', value: 18 },
  { market: '欧洲', value: 12 },
  { market: '其他', value: 10 },
]

export default function DashboardPage() {
  const stats = mockStats

  const lineConfig = {
    data: mockTrafficData,
    xField: 'date',
    yField: 'visitors',
    smooth: true,
    height: 280,
    color: '#1890ff',
    xAxis: {
      label: {
        formatter: (v: string) => dayjs(v).format('MM-DD'),
      },
    },
  }

  const columnConfig = {
    data: mockToolUsage,
    xField: 'tool',
    yField: 'usage',
    color: '#52c41a',
    height: 250,
    label: {
      position: 'top' as const,
    },
  }

  const pieConfig = {
    data: mockMarketDistribution,
    angleField: 'value',
    colorField: 'market',
    radius: 0.8,
    innerRadius: 0.6,
    height: 250,
    legend: {
      position: 'right' as const,
    },
    label: false,
  }

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '公司',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: '产品类型',
      dataIndex: 'product',
      key: 'product',
    },
    {
      title: '目标市场',
      dataIndex: 'market',
      key: 'market',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: '待处理' },
          following: { color: 'blue', text: '跟进中' },
          completed: { color: 'green', text: '已成交' },
          failed: { color: 'red', text: '已失败' },
        }
        const { color, text } = statusMap[status] || { color: 'default', text: status }
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space>
          <Button type="link" size="small">
            查看
          </Button>
          <Button type="link" size="small">
            跟进
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>数据概览</h2>
        <Space>
          <RangePicker />
          <Button icon={<ExportOutlined />}>导出数据</Button>
        </Space>
      </div>

      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日访客"
              value={stats.todayVisitors}
              prefix={<EyeOutlined />}
              suffix="人"
              styles={{ content: { color: '#1890ff' } }}
            />
            <div style={{ color: stats.todayVisitorsChange > 0 ? '#52c41a' : '#ff4d4f' }}>
              {stats.todayVisitorsChange > 0 ? '+' : ''}{stats.todayVisitorsChange}% 较昨日
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              suffix="人"
              styles={{ content: { color: '#52c41a' } }}
            />
            <div style={{ color: stats.totalUsersChange > 0 ? '#52c41a' : '#ff4d4f' }}>
              {stats.totalUsersChange > 0 ? '+' : ''}{stats.totalUsersChange}% 较上周
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="询盘总数"
              value={stats.inquiries}
              prefix={<MessageOutlined />}
              suffix="条"
              styles={{ content: { color: '#faad14' } }}
            />
            <div style={{ color: stats.inquiriesChange > 0 ? '#52c41a' : '#ff4d4f' }}>
              {stats.inquiriesChange > 0 ? '+' : ''}{stats.inquiriesChange}% 较上周
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="转化率"
              value={stats.conversionRate}
              prefix={<RiseOutlined />}
              suffix="%"
              styles={{ content: { color: '#722ed1' } }}
            />
            <div style={{ color: stats.conversionRateChange > 0 ? '#52c41a' : '#ff4d4f' }}>
              {stats.conversionRateChange > 0 ? '+' : ''}{stats.conversionRateChange}% 较上周
            </div>
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="访问趋势">
            <Line {...lineConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="目标市场分布">
            <Pie {...pieConfig} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="工具使用排行">
            <Column {...columnConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title="最新询盘" 
            extra={<Button type="link" href="/admin/inquiries">查看全部</Button>}
          >
            <Table
              columns={columns}
              dataSource={mockRecentInquiries}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
