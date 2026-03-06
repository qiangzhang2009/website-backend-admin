/**
 * 询盘管理页面
 * 支持线索分配、状态跟踪、跟进记录
 */

'use client'

import { useState } from 'react'
import { Table, Card, Input, Select, Button, Space, Tag, Form, Timeline, Drawer } from 'antd'
import { SearchOutlined, PlusOutlined, ExportOutlined, PhoneOutlined, MessageOutlined } from '@ant-design/icons'

const { Option } = Select
const { TextArea } = Input

// 模拟询盘数据
const mockInquiries = [
  {
    id: '1',
    name: '王建国',
    phone: '138****1234',
    email: 'wang@pharma.com',
    company: '浙江医药集团',
    productType: '保健食品',
    targetMarket: '日本',
    message: '想了解保健食品进入日本市场的具体流程和费用',
    status: 'pending',
    priority: 'high',
    assignee: '张强',
    source: '成本计算器',
    createdAt: '2026-03-05 14:30',
    updatedAt: '2026-03-05 14:30',
  },
  {
    id: '2',
    name: '李明华',
    phone: '139****5678',
    email: 'li@herbal.com',
    company: '广东中药厂',
    productType: '中成药',
    targetMarket: '东南亚',
    message: '了解中成药在东南亚的市场准入政策',
    status: 'following',
    priority: 'medium',
    assignee: '李静',
    source: '网站表单',
    createdAt: '2026-03-04 10:20',
    updatedAt: '2026-03-05 09:15',
  },
  {
    id: '3',
    name: '张小芳',
    phone: '136****9012',
    email: 'zhang@device.com',
    company: '上海医疗器械',
    productType: '医疗器械',
    targetMarket: '欧洲',
    message: '医疗器械CE认证流程及周期',
    status: 'completed',
    priority: 'high',
    assignee: '张强',
    source: '政策查询',
    createdAt: '2026-03-01 11:30',
    updatedAt: '2026-03-04 16:20',
  },
  {
    id: '4',
    name: '刘强',
    phone: '137****3456',
    email: 'liu@cosmetic.com',
    company: '广州化妆品公司',
    productType: '化妆品',
    targetMarket: '澳大利亚',
    message: '化妆品进入澳大利亚市场需要哪些资质',
    status: 'failed',
    priority: 'low',
    assignee: '刘潇',
    source: 'ROI模拟',
    createdAt: '2026-03-03 16:45',
    updatedAt: '2026-03-04 10:00',
  },
  {
    id: '5',
    name: '陈先生',
    phone: '135****7890',
    email: 'chen@trade.com',
    company: '江苏贸易公司',
    productType: '普通食品',
    targetMarket: '日本',
    message: '普通食品出口日本的市场前景',
    status: 'pending',
    priority: 'medium',
    assignee: null,
    source: '时间估算',
    createdAt: '2026-03-05 09:00',
    updatedAt: '2026-03-05 09:00',
  },
]

type InquiryRecord = typeof mockInquiries[0]

const columns = [
  {
    title: '姓名',
    dataIndex: 'name',
    key: 'name',
    width: 100,
  },
  {
    title: '联系方式',
    key: 'contact',
    width: 180,
    render: (_: unknown, record: InquiryRecord) => (
      <Space direction="vertical" size={0}>
        <span>{record.phone}</span>
        <span style={{ color: '#888', fontSize: 12 }}>{record.email}</span>
      </Space>
    ),
  },
  {
    title: '公司',
    dataIndex: 'company',
    key: 'company',
    width: 150,
  },
  {
    title: '产品/市场',
    key: 'product_market',
    width: 140,
    render: (_: unknown, record: InquiryRecord) => (
      <Space direction="vertical" size={0}>
        <Tag>{record.productType}</Tag>
        <Tag color="blue">{record.targetMarket}</Tag>
      </Space>
    ),
  },
  {
    title: '需求描述',
    dataIndex: 'message',
    key: 'message',
    width: 200,
    ellipsis: true,
  },
  {
    title: '来源',
    dataIndex: 'source',
    key: 'source',
    width: 100,
    render: (source: string) => <Tag color="purple">{source}</Tag>,
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: 80,
    render: (priority: string) => {
      const colorMap: Record<string, string> = { high: 'red', medium: 'orange', low: 'default' }
      return <Tag color={colorMap[priority] || 'default'}>{priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}</Tag>
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (status: string) => {
      const statusMap: Record<string, { color: string; text: string }> = {
        pending: { color: 'orange', text: '待处理' },
        following: { color: 'blue', text: '跟进中' },
        completed: { color: 'green', text: '已成交' },
        failed: { color: 'red', text: '已流失' },
      }
      const { color, text } = statusMap[status] || { color: 'default', text: status }
      return <Tag color={color}>{text}</Tag>
    },
  },
  {
    title: '负责人',
    dataIndex: 'assignee',
    key: 'assignee',
    width: 80,
    render: (assignee: string) => assignee || <Tag>未分配</Tag>,
  },
  {
    title: '时间',
    key: 'time',
    width: 140,
    render: (_: unknown, record: InquiryRecord) => (
      <Space direction="vertical" size={0}>
        <span style={{ fontSize: 12 }}>{record.createdAt}</span>
      </Space>
    ),
  },
  {
    title: '操作',
    key: 'action',
    width: 120,
    render: () => (
      <Space>
        <Button type="link" size="small">编辑</Button>
        <Button type="link" size="small">跟进</Button>
      </Space>
    ),
  },
]

export default function InquiriesPage() {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRecord | null>(null)

  const filteredInquiries = mockInquiries.filter(inquiry => {
    if (searchText && !inquiry.name.includes(searchText) && !inquiry.company.includes(searchText)) {
      return false
    }
    if (statusFilter && inquiry.status !== statusFilter) {
      return false
    }
    if (priorityFilter && inquiry.priority !== priorityFilter) {
      return false
    }
    return true
  })

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="搜索姓名或公司"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <Select placeholder="状态" allowClear value={statusFilter} onChange={setStatusFilter} style={{ width: 100 }}>
              <Option value="pending">待处理</Option>
              <Option value="following">跟进中</Option>
              <Option value="completed">已成交</Option>
              <Option value="failed">已流失</Option>
            </Select>
            <Select placeholder="优先级" allowClear value={priorityFilter} onChange={setPriorityFilter} style={{ width: 100 }}>
              <Option value="high">高</Option>
              <Option value="medium">中</Option>
              <Option value="low">低</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />}>新建询盘</Button>
            <Button icon={<ExportOutlined />}>导出</Button>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={filteredInquiries}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          onRow={record => ({
            onClick: () => {
              setSelectedInquiry(record)
              setDrawerVisible(true)
            },
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <Drawer
        title="询盘详情"
        placement="right"
        width={500}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedInquiry && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h3>{selectedInquiry.name}</h3>
              <p>{selectedInquiry.company}</p>
              <Space>
                <Tag>{selectedInquiry.productType}</Tag>
                <Tag color="blue">{selectedInquiry.targetMarket}</Tag>
              </Space>
            </div>
            <Form layout="vertical">
              <Form.Item label="状态">
                <Select defaultValue={selectedInquiry.status}>
                  <Option value="pending">待处理</Option>
                  <Option value="following">跟进中</Option>
                  <Option value="completed">已成交</Option>
                  <Option value="failed">已流失</Option>
                </Select>
              </Form.Item>
              <Form.Item label="优先级">
                <Select defaultValue={selectedInquiry.priority}>
                  <Option value="high">高</Option>
                  <Option value="medium">中</Option>
                  <Option value="low">低</Option>
                </Select>
              </Form.Item>
              <Form.Item label="负责人">
                <Select defaultValue={selectedInquiry.assignee} placeholder="分配给">
                  <Option value="张强">张强</Option>
                  <Option value="李静">李静</Option>
                  <Option value="刘潇">刘潇</Option>
                </Select>
              </Form.Item>
              <Form.Item label="跟进记录">
                <Timeline
                  items={[
                    { color: 'green', children: '2026-03-05 14:30 创建询盘' },
                    { color: 'blue', children: '2026-03-05 15:00 销售首次联系，客户表示感兴趣' },
                    { color: 'blue', children: '2026-03-05 16:30 发送详细方案资料' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="新建跟进">
                <TextArea rows={3} placeholder="记录跟进情况..." />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" icon={<PhoneOutlined />}>拨打电话</Button>
                  <Button icon={<MessageOutlined />}>发送邮件</Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Drawer>
    </div>
  )
}
