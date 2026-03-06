/**
 * 转化漏斗与归因分析页面
 * 分析用户转化路径和渠道归因
 */

'use client'

import { useState } from 'react'
import { Card, Row, Col, Tabs, Table, Tag, Select, Space, Radio, DatePicker } from 'antd'
import { Column, Line, Funnel } from '@ant-design/charts'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

// 转化漏斗数据
const mockFunnelData = [
  { stage: '网站访问', count: 12580, rate: 100 },
  { stage: '工具使用', count: 6280, rate: 49.9 },
  { stage: '注册/留资', count: 2512, rate: 20.0 },
  { stage: '询盘提交', count: 628, rate: 5.0 },
  { stage: '销售跟进', count: 314, rate: 2.5 },
  { stage: '成交转化', count: 89, rate: 0.7 },
]

// 归因数据 - 首次点击
const mockFirstTouchData = [
  { channel: '搜索引擎', conversions: 45, revenue: 2250000, cost: 50000, roi: 4400 },
  { channel: '社交媒体', conversions: 28, revenue: 1400000, cost: 30000, roi: 4567 },
  { channel: '直接访问', conversions: 35, revenue: 1750000, cost: 0, roi: Infinity },
  { channel: '外部链接', conversions: 18, revenue: 900000, cost: 15000, roi: 5900 },
  { channel: '邮件营销', conversions: 12, revenue: 600000, cost: 8000, roi: 7400 },
]

// 归因数据 - 末次点击
const mockLastTouchData = [
  { channel: '搜索引擎', conversions: 52, revenue: 2600000, cost: 50000, roi: 5100 },
  { channel: '社交媒体', conversions: 15, revenue: 750000, cost: 30000, roi: 2400 },
  { channel: '直接访问', conversions: 48, revenue: 2400000, cost: 0, roi: Infinity },
  { channel: '外部链接', conversions: 12, revenue: 600000, cost: 15000, roi: 3900 },
  { channel: '邮件营销', conversions: 11, revenue: 550000, cost: 8000, roi: 6775 },
]

// 归因数据 - 线性归因
const mockLinearData = [
  { channel: '搜索引擎', conversions: 38, revenue: 1900000, cost: 50000, roi: 3700 },
  { channel: '社交媒体', conversions: 22, revenue: 1100000, cost: 30000, roi: 3567 },
  { channel: '直接访问', conversions: 42, revenue: 2100000, cost: 0, roi: Infinity },
  { channel: '外部链接', conversions: 16, revenue: 800000, cost: 15000, roi: 5233 },
  { channel: '邮件营销', conversions: 20, revenue: 1000000, cost: 8000, roi: 12400 },
]

// 转化路径分析
const mockPathsData = [
  { path: '搜索 → 直接 → 询盘', count: 156, rate: 24.8, revenue: 7800000 },
  { path: '社交 → 搜索 → 直接 → 询盘', count: 89, rate: 14.2, revenue: 4450000 },
  { path: '直接 → 工具 → 询盘', count: 78, rate: 12.4, revenue: 3900000 },
  { path: '搜索 → 工具 → 询盘', count: 65, rate: 10.3, revenue: 3250000 },
  { path: '邮件 → 直接 → 询盘', count: 45, rate: 7.2, revenue: 2250000 },
]

// 页面转化分析
const mockPageConversionData = [
  { page: '/services', entry: 8500, bounce: 2100, conversion: 320, avgTime: '3:25' },
  { page: '/tools/cost-calculator', entry: 5200, bounce: 850, conversion: 580, avgTime: '5:48' },
  { page: '/markets', entry: 3800, bounce: 1200, conversion: 210, avgTime: '4:12' },
  { page: '/tools/policy', entry: 2800, bounce: 420, conversion: 380, avgTime: '3:15' },
  { page: '/contact', entry: 2200, bounce: 380, conversion: 420, avgTime: '2:30' },
]

// 时间维度转化数据
const mockTimeData = [
  { date: '2026-02-27', visitors: 980, inquiry: 42, deal: 3 },
  { date: '2026-02-28', visitors: 1120, inquiry: 55, deal: 4 },
  { date: '2026-03-01', visitors: 1050, inquiry: 48, deal: 3 },
  { date: '2026-03-02', visitors: 1340, inquiry: 68, deal: 5 },
  { date: '2026-03-03', visitors: 980, inquiry: 38, deal: 2 },
  { date: '2026-03-04', visitors: 1260, inquiry: 62, deal: 4 },
  { date: '2026-03-05', visitors: 1280, inquiry: 65, deal: 5 },
]

export default function AttributionPage() {
  const [activeTab, setActiveTab] = useState('funnel')
  const [attributionModel, setAttributionModel] = useState('first')

  const funnelConfig = {
    data: mockFunnelData,
    xField: 'stage',
    yField: 'count',
    label: {
      position: 'middle' as const,
      content: (data: { count: number; rate: number }) => `${data.count}\n(${data.rate}%)`,
    },
    conversionTag: false,
    height: 350,
  }

  type FunnelRow = { stage: string; count: number; rate: number }
  type ChannelRow = { channel: string; conversions: number; revenue: number; cost: number; roi: number }
  type PathRow = { path: string; count: number; rate: number; revenue: number }
  type PageRow = { page: string; entry: number; bounce: number; conversion: number; avgTime: string }

  const funnelColumns = [
    { title: '阶段', dataIndex: 'stage', key: 'stage' },
    { title: '用户数', dataIndex: 'count', key: 'count', sorter: (a: FunnelRow, b: FunnelRow) => a.count - b.count },
    { title: '转化率', dataIndex: 'rate', key: 'rate', render: (r: number) => `${r}%` },
    { title: '流失率', key: 'loss', render: (_: unknown, __: FunnelRow, idx: number) => idx === 0 ? '-' : `${(mockFunnelData[idx-1].rate - mockFunnelData[idx].rate).toFixed(1)}%` },
  ]

  const channelColumns = [
    { title: '渠道', dataIndex: 'channel', key: 'channel', render: (c: string) => <Tag color="blue">{c}</Tag> },
    { title: '转化数', dataIndex: 'conversions', key: 'conversions', sorter: (a: ChannelRow, b: ChannelRow) => a.conversions - b.conversions },
    { title: '收入', dataIndex: 'revenue', key: 'revenue', render: (r: number) => `¥${(r/10000).toFixed(0)}万` },
    { title: '成本', dataIndex: 'cost', key: 'cost', render: (c: number) => c === 0 ? '-' : `¥${(c/10000).toFixed(0)}万` },
    { title: 'ROI', dataIndex: 'roi', key: 'roi', render: (r: number) => r === Infinity ? '∞' : `${r}%` },
  ]

  const pathColumns = [
    { title: '转化路径', dataIndex: 'path', key: 'path', render: (p: string) => <Tag>{p}</Tag> },
    { title: '次数', dataIndex: 'count', key: 'count', sorter: (a: PathRow, b: PathRow) => a.count - b.count },
    { title: '占比', dataIndex: 'rate', key: 'rate', render: (r: number) => `${r}%` },
    { title: '收入', dataIndex: 'revenue', key: 'revenue', render: (r: number) => `¥${(r/10000).toFixed(0)}万` },
  ]

  const pageColumns = [
    { title: '页面', dataIndex: 'page', key: 'page' },
    { title: '入口流量', dataIndex: 'entry', key: 'entry' },
    { title: '跳出', dataIndex: 'bounce', key: 'bounce', render: (b: number, r: PageRow) => `${b} (${(b/r.entry*100).toFixed(1)}%)` },
    { title: '转化', dataIndex: 'conversion', key: 'conversion' },
    { title: '转化率', key: 'rate', render: (_: unknown, r: PageRow) => `${(r.conversion/r.entry*100).toFixed(1)}%` },
    { title: '平均停留', dataIndex: 'avgTime', key: 'avgTime' },
  ]

  const lineConfig = {
    data: mockTimeData,
    xField: 'date',
    yField: 'visitors',
    height: 300,
    smooth: true,
    xAxis: { label: { formatter: (v: string) => dayjs(v).format('MM-DD') } },
  }

  const getAttributionData = () => {
    switch(attributionModel) {
      case 'first': return mockFirstTouchData
      case 'last': return mockLastTouchData
      case 'linear': return mockLinearData
      default: return mockFirstTouchData
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>转化漏斗与归因分析</h2>
        <Space>
          <RangePicker />
          <Select defaultValue="30d" style={{ width: 100 }}>
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
            key: 'funnel',
            label: '转化漏斗',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title="用户转化漏斗">
                    <Funnel {...funnelConfig} />
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card>
                    <Table 
                      dataSource={mockFunnelData} 
                      columns={funnelColumns} 
                      pagination={false} 
                      rowKey="stage" 
                    />
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card title="每日转化趋势">
                    <Line {...lineConfig} />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'attribution',
            label: '渠道归因',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card 
                    title="归因模型对比"
                    extra={
                      <Radio.Group value={attributionModel} onChange={e => setAttributionModel(e.target.value)}>
                        <Radio.Button value="first">首次点击</Radio.Button>
                        <Radio.Button value="last">末次点击</Radio.Button>
                        <Radio.Button value="linear">线性</Radio.Button>
                      </Radio.Group>
                    }
                  >
                    <Table 
                      dataSource={getAttributionData()} 
                      columns={channelColumns} 
                      pagination={false} 
                      rowKey="channel" 
                    />
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card title="各渠道贡献占比">
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Column 
                          data={getAttributionData()} 
                          xField="channel" 
                          yField="conversions" 
                          height={250}
                          label={{ position: 'top' }}
                        />
                      </Col>
                      <Col xs={24} md={12}>
                        <Column 
                          data={getAttributionData()} 
                          xField="channel" 
                          yField="revenue" 
                          height={250}
                          label={{ position: 'top', formatter: (v: number) => `¥${(v/10000).toFixed(0)}万` }}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'paths',
            label: '转化路径',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title="热门转化路径">
                    <Table 
                      dataSource={mockPathsData} 
                      columns={pathColumns} 
                      pagination={false} 
                      rowKey="path" 
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'pages',
            label: '页面转化',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title="页面转化分析">
                    <Table 
                      dataSource={mockPageConversionData} 
                      columns={pageColumns} 
                      pagination={false} 
                      rowKey="page" 
                    />
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
