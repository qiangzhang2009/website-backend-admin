/**
 * 数据分析页面
 * 流量分析、转化漏斗、工具使用分析
 */

'use client'

import { useState } from 'react'
import { Card, Row, Col, Tabs, Table, Tag, DatePicker, Select, Space } from 'antd'
import { Line, Bar } from '@ant-design/charts'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

// 流量数据
const mockTrafficData = [
  { date: '2026-02-27', pv: 1250, uv: 98, sessions: 112 },
  { date: '2026-02-28', pv: 1380, uv: 112, sessions: 125 },
  { date: '2026-03-01', pv: 1420, uv: 105, sessions: 118 },
  { date: '2026-03-02', pv: 1680, uv: 134, sessions: 148 },
  { date: '2026-03-03', pv: 1320, uv: 98, sessions: 110 },
  { date: '2026-03-04', pv: 1550, uv: 126, sessions: 138 },
  { date: '2026-03-05', pv: 1620, uv: 128, sessions: 142 },
]

// 来源分析
const mockSourceData = [
  { source: '搜索引擎', visits: 856, rate: 42.5 },
  { source: '直接访问', visits: 524, rate: 26.0 },
  { source: '社交媒体', visits: 312, rate: 15.5 },
  { source: '外部链接', visits: 186, rate: 9.2 },
  { source: '邮件营销', visits: 134, rate: 6.7 },
]

// 转化漏斗
const mockFunnelData = [
  { stage: '访问', count: 3652, rate: 100 },
  { stage: '工具使用', count: 1826, rate: 50 },
  { stage: '表单提交', count: 365, rate: 10 },
  { stage: '销售跟进', count: 182, rate: 5 },
  { stage: '成交', count: 52, rate: 1.4 },
]

// 页面排行
const mockPageData = [
  { page: '/services', pv: 2456, uv: 1230, avgTime: '2:35' },
  { page: '/markets', pv: 1890, uv: 945, avgTime: '3:12' },
  { page: '/tools', pv: 1560, uv: 780, avgTime: '5:48' },
  { page: '/contact', pv: 980, uv: 490, avgTime: '1:25' },
  { page: '/about', pv: 650, uv: 325, avgTime: '1:45' },
]

// 工具使用详细数据
const mockToolDetailData = [
  { tool: '成本计算器', total: 456, completed: 312, abandoned: 144, avgTime: '4:25' },
  { tool: '时间估算', total: 312, completed: 245, abandoned: 67, avgTime: '3:15' },
  { tool: '政策查询', total: 287, completed: 268, abandoned: 19, avgTime: '2:45' },
  { tool: 'ROI模拟', total: 198, completed: 156, abandoned: 42, avgTime: '5:30' },
  { tool: '风险评估', total: 156, completed: 98, abandoned: 58, avgTime: '6:20' },
]

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('traffic')

  const trafficConfig = {
    data: mockTrafficData,
    xField: 'date',
    yField: 'pv',
    smooth: true,
    height: 300,
    color: '#1890ff',
    xAxis: { label: { formatter: (v: string) => dayjs(v).format('MM-DD') } },
    legend: { position: 'top' as const },
  }

  const sourceConfig = {
    data: mockSourceData,
    xField: 'source',
    yField: 'visits',
    color: '#52c41a',
    height: 300,
    label: { position: 'top' as const },
  }

  const funnelConfig = {
    data: mockFunnelData,
    xField: 'stage',
    yField: 'count',
    color: '#722ed1',
    height: 300,
    label: { position: 'top' as const, formatter: (d: { count: number; rate: number }) => `${d.count} (${d.rate}%)` },
  }

  type PageRow = { page: string; pv: number; uv: number; avgTime: string }
  type ToolRow = { tool: string; total: number; completed: number; abandoned: number; avgTime: string }

  const pageColumns = [
    { title: '页面', dataIndex: 'page', key: 'page' },
    { title: '浏览量', dataIndex: 'pv', key: 'pv', sorter: (a: PageRow, b: PageRow) => a.pv - b.pv },
    { title: '独立访客', dataIndex: 'uv', key: 'uv' },
    { title: '平均停留', dataIndex: 'avgTime', key: 'avgTime' },
  ]

  const toolColumns = [
    { title: '工具', dataIndex: 'tool', key: 'tool' },
    { title: '总使用', dataIndex: 'total', key: 'total' },
    { title: '完成', dataIndex: 'completed', key: 'completed', render: (v: number, r: ToolRow) => <Tag color="green">{v} ({Math.round(v/r.total*100)}%)</Tag> },
    { title: '放弃', dataIndex: 'abandoned', key: 'abandoned', render: (v: number, r: ToolRow) => <Tag color="red">{v} ({Math.round(v/r.total*100)}%)</Tag> },
    { title: '平均用时', dataIndex: 'avgTime', key: 'avgTime' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>数据分析</h2>
        <Space>
          <RangePicker />
          <Select defaultValue="7d" style={{ width: 100 }}>
            <Select.Option value="7d">最近7天</Select.Option>
            <Select.Option value="30d">最近30天</Select.Option>
            <Select.Option value="90d">最近90天</Select.Option>
          </Select>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'traffic',
            label: '流量分析',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title="流量趋势">
                    <Line {...trafficConfig} />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="来源分布">
                    <Bar {...sourceConfig} />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="热门页面">
                    <Table dataSource={mockPageData} columns={pageColumns} pagination={false} size="small" />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'funnel',
            label: '转化漏斗',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title="用户转化漏斗">
                    <Bar {...funnelConfig} />
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card title="各阶段转化率">
                    <Table
                      dataSource={mockFunnelData}
                      columns={[
                        { title: '阶段', dataIndex: 'stage', key: 'stage' },
                        { title: '用户数', dataIndex: 'count', key: 'count' },
                        { title: '转化率', dataIndex: 'rate', key: 'rate', render: (v: number) => `${v}%` },
                        {
                          title: '流失率',
                          key: 'loss',
                          render: (_: unknown, __: unknown, index: number) => {
                            if (index === 0) return '-'
                            const prev = mockFunnelData[index - 1].count
                            const curr = mockFunnelData[index].count
                            return `${Math.round((prev - curr) / prev * 100)}%`
                          }
                        },
                      ]}
                      pagination={false}
                      rowKey="stage"
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'tools',
            label: '工具分析',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title="工具使用详情">
                    <Table dataSource={mockToolDetailData} columns={toolColumns} pagination={false} rowKey="tool" />
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  )
}
