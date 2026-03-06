/**
 * 工具数据页面
 * 展示网站工具使用情况和用户交互数据
 */

'use client'

import { useState } from 'react'
import { Card, Row, Col, Table, Tag, Space, Select, Progress, Tabs } from 'antd'
import { Column } from '@ant-design/charts'

// 工具使用概览
const mockToolOverview = [
  { tool: '成本计算器', total: 456, completed: 312, abandoned: 144, avgTime: '4:25', rate: 68.4 },
  { tool: '时间估算', total: 312, completed: 245, abandoned: 67, avgTime: '3:15', rate: 78.5 },
  { tool: '政策查询', total: 287, completed: 268, abandoned: 19, avgTime: '2:45', rate: 93.4 },
  { tool: 'ROI模拟', total: 198, completed: 156, abandoned: 42, avgTime: '5:30', rate: 78.8 },
  { tool: '风险评估', total: 156, completed: 98, abandoned: 58, avgTime: '6:20', rate: 62.8 },
]

// 成本计算器详细数据
const mockCostCalculatorData = [
  { param: '产品类型-保健食品', count: 186, rate: 40.8 },
  { param: '产品类型-中成药', count: 124, rate: 27.2 },
  { param: '产品类型-化妆品', count: 89, rate: 19.5 },
  { param: '产品类型-医疗器械', count: 57, rate: 12.5 },
]

// 时间估算详细数据
const mockTimeEstimationData = [
  { param: '目标市场-日本', count: 145, rate: 46.5 },
  { param: '目标市场-东南亚', count: 89, rate: 28.5 },
  { param: '目标市场-欧洲', count: 45, rate: 14.4 },
  { param: '目标市场-澳大利亚', count: 33, rate: 10.6 },
]

// 用户使用记录
const mockToolUsageRecords = [
  { id: '1', user: '王建国', tool: '成本计算器', action: '提交', result: '完成', product: '保健食品', market: '日本', time: '2026-03-05 14:30' },
  { id: '2', user: '李明华', tool: '时间估算', action: '提交', result: '完成', product: '中成药', market: '东南亚', time: '2026-03-05 10:20' },
  { id: '3', user: '张小芳', tool: '政策查询', action: '查询', result: '完成', product: '医疗器械', market: '欧洲', time: '2026-03-04 16:45' },
  { id: '4', user: '刘强', tool: 'ROI模拟', action: '提交', result: '放弃', product: '化妆品', market: '澳大利亚', time: '2026-03-04 14:30' },
  { id: '5', user: '陈先生', tool: '风险评估', action: '提交', result: '完成', product: '普通食品', market: '日本', time: '2026-03-04 11:15' },
  { id: '6', user: '赵女士', tool: '成本计算器', action: '提交', result: '完成', product: '保健食品', market: '日本', time: '2026-03-03 15:40' },
]

const columns = [
  { title: '用户', dataIndex: 'user', key: 'user' },
  { title: '工具', dataIndex: 'tool', key: 'tool', render: (tool: string) => <Tag color="blue">{tool}</Tag> },
  { title: '操作', dataIndex: 'action', key: 'action' },
  { title: '结果', dataIndex: 'result', key: 'result', render: (result: string) => <Tag color={result === '完成' ? 'green' : 'orange'}>{result}</Tag> },
  { title: '产品', dataIndex: 'product', key: 'product' },
  { title: '市场', dataIndex: 'market', key: 'market', render: (market: string) => <Tag>{market}</Tag> },
  { title: '时间', dataIndex: 'time', key: 'time' },
]

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState('overview')

  const columnConfig = {
    data: mockToolOverview,
    xField: 'tool',
    yField: 'total',
    height: 300,
    label: { position: 'top' as const },
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>工具数据</h2>
        <Space>
          <Select defaultValue="7d" style={{ width: 100 }}>
            <Select.Option value="7d">最近7天</Select.Option>
            <Select.Option value="30d">最近30天</Select.Option>
          </Select>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: '使用概览',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title="各工具使用次数">
                    <Column {...columnConfig} />
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card title="工具使用详情">
                    <Table
                      dataSource={mockToolOverview}
                      rowKey="tool"
                      pagination={false}
                      columns={[
                        { title: '工具', dataIndex: 'tool', key: 'tool', render: (t: string) => <Tag color="blue">{t}</Tag> },
                        { title: '总使用次数', dataIndex: 'total', key: 'total' },
                        { title: '完成次数', dataIndex: 'completed', key: 'completed', render: (v: number) => <span style={{ color: '#52c41a' }}>{v}</span> },
                        { title: '放弃次数', dataIndex: 'abandoned', key: 'abandoned', render: (v: number) => <span style={{ color: '#ff4d4f' }}>{v}</span> },
                        { title: '平均用时', dataIndex: 'avgTime', key: 'avgTime' },
                        { 
                          title: '完成率', 
                          dataIndex: 'rate', 
                          key: 'rate',
                          render: (rate: number) => (
                            <Progress percent={rate} size="small" status={rate > 70 ? 'success' : rate > 50 ? 'normal' : 'exception'} />
                          )
                        },
                      ]}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'detail',
            label: '详细分析',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="成本计算器 - 产品类型分布">
                    <Column data={mockCostCalculatorData} xField="param" yField="count" height={250} />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="时间估算 - 目标市场分布">
                    <Column data={mockTimeEstimationData} xField="param" yField="count" height={250} />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'records',
            label: '使用记录',
            children: (
              <Card>
                <Table
                  dataSource={mockToolUsageRecords}
                  columns={columns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}
