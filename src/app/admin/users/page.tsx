/**
 * 用户列表页面
 * 支持用户搜索、筛选、查看详情
 */

'use client'

import { useState } from 'react'
import { Table, Card, Input, Select, Button, Space, Tag, Modal, Descriptions, Tabs, Timeline } from 'antd'
import { SearchOutlined, EyeOutlined, ExportOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Option } = Select

// 模拟用户数据
const mockUsers = [
  {
    id: '1',
    name: '王建国',
    phone: '138****1234',
    email: 'wang@pharma.com',
    company: '浙江医药集团',
    productType: '保健食品',
    targetMarket: '日本',
    visitCount: 15,
    toolUsage: ['成本计算器', '时间估算', '政策查询'],
    lastVisit: '2026-03-05 14:30',
    status: 'high_intent',
    tags: ['高意向', '日本市场', '保健食品'],
  },
  {
    id: '2',
    name: '李明华',
    phone: '139****5678',
    email: 'li@herbal.com',
    company: '广东中药厂',
    productType: '中成药',
    targetMarket: '东南亚',
    visitCount: 8,
    toolUsage: ['成本计算器', 'ROI模拟'],
    lastVisit: '2026-03-04 10:20',
    status: 'medium_intent',
    tags: ['中意向', '东南亚'],
  },
  {
    id: '3',
    name: '张小芳',
    phone: '136****9012',
    email: 'zhang@device.com',
    company: '上海医疗器械',
    productType: '医疗器械',
    targetMarket: '欧洲',
    visitCount: 22,
    toolUsage: ['成本计算器', '时间估算', '政策查询', 'ROI模拟', '风险评估'],
    lastVisit: '2026-03-05 09:15',
    status: 'high_intent',
    tags: ['高意向', '欧洲市场', '医疗器械', '多次询盘'],
  },
  {
    id: '4',
    name: '刘强',
    phone: '137****3456',
    email: 'liu@cosmetic.com',
    company: '广州化妆品公司',
    productType: '化妆品',
    targetMarket: '澳大利亚',
    visitCount: 5,
    toolUsage: ['政策查询'],
    lastVisit: '2026-03-03 16:45',
    status: 'low_intent',
    tags: ['低意向'],
  },
  {
    id: '5',
    name: '陈先生',
    phone: '135****7890',
    email: 'chen@trade.com',
    company: '江苏贸易公司',
    productType: '普通食品',
    targetMarket: '日本',
    visitCount: 12,
    toolUsage: ['成本计算器', '时间估算'],
    lastVisit: '2026-03-04 11:30',
    status: 'medium_intent',
    tags: ['中意向', '日本市场'],
  },
]

const columns: ColumnsType = [
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
    render: (_, record) => (
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
    title: '产品类型',
    dataIndex: 'productType',
    key: 'productType',
    width: 100,
  },
  {
    title: '目标市场',
    dataIndex: 'targetMarket',
    key: 'targetMarket',
    width: 100,
    render: (market: string) => <Tag color="blue">{market}</Tag>,
  },
  {
    title: '访问次数',
    dataIndex: 'visitCount',
    key: 'visitCount',
    width: 80,
    sorter: (a, b) => a.visitCount - b.visitCount,
  },
  {
    title: '使用工具',
    key: 'tools',
    width: 200,
    render: (_, record) => (
      <Space wrap>
        {record.toolUsage.map((tool: string) => (
          <Tag key={tool} color="green">{tool}</Tag>
        ))}
      </Space>
    ),
  },
  {
    title: '意向度',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (status: string) => {
      const statusMap: Record<string, { color: string; text: string }> = {
        high_intent: { color: 'red', text: '高意向' },
        medium_intent: { color: 'orange', text: '中意向' },
        low_intent: { color: 'default', text: '低意向' },
      }
      const { color, text } = statusMap[status] || { color: 'default', text: status }
      return <Tag color={color}>{text}</Tag>
    },
  },
  {
    title: '最近访问',
    dataIndex: 'lastVisit',
    key: 'lastVisit',
    width: 150,
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    render: () => (
      <Space>
        <Button type="link" icon={<EyeOutlined />}>查看</Button>
      </Space>
    ),
  },
]

export default function UsersPage() {
  const loading = false
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [marketFilter, setMarketFilter] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<typeof mockUsers[0] | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  const filteredUsers = mockUsers.filter(user => {
    if (searchText && !user.name.includes(searchText) && !user.company.includes(searchText)) {
      return false
    }
    if (statusFilter && user.status !== statusFilter) {
      return false
    }
    if (marketFilter && user.targetMarket !== marketFilter) {
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
            <Select
              placeholder="意向度"
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
            >
              <Option value="high_intent">高意向</Option>
              <Option value="medium_intent">中意向</Option>
              <Option value="low_intent">低意向</Option>
            </Select>
            <Select
              placeholder="目标市场"
              allowClear
              value={marketFilter}
              onChange={setMarketFilter}
              style={{ width: 120 }}
            >
              <Option value="日本">日本</Option>
              <Option value="东南亚">东南亚</Option>
              <Option value="欧洲">欧洲</Option>
              <Option value="澳大利亚">澳大利亚</Option>
            </Select>
            <Button icon={<ReloadOutlined />}>重置</Button>
            <Button icon={<ExportOutlined />}>导出</Button>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          onRow={record => ({
            onClick: () => {
              setSelectedUser(record as typeof mockUsers[0])
              setModalVisible(true)
            },
          })}
        />
      </Card>

      <Modal
        title={`用户详情 - ${selectedUser?.name}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[<Button key="close" onClick={() => setModalVisible(false)}>关闭</Button>]}
        width={800}
      >
        {selectedUser && (
          <Tabs
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <Descriptions column={2}>
                    <Descriptions.Item label="姓名">{selectedUser.name}</Descriptions.Item>
                    <Descriptions.Item label="电话">{selectedUser.phone}</Descriptions.Item>
                    <Descriptions.Item label="邮箱">{selectedUser.email}</Descriptions.Item>
                    <Descriptions.Item label="公司">{selectedUser.company}</Descriptions.Item>
                    <Descriptions.Item label="产品类型">{selectedUser.productType}</Descriptions.Item>
                    <Descriptions.Item label="目标市场">{selectedUser.targetMarket}</Descriptions.Item>
                    <Descriptions.Item label="访问次数">{selectedUser.visitCount}</Descriptions.Item>
                    <Descriptions.Item label="最近访问">{selectedUser.lastVisit}</Descriptions.Item>
                    <Descriptions.Item label="意向度">
                      <Tag color={
                        selectedUser.status === 'high_intent' ? 'red' : 
                        selectedUser.status === 'medium_intent' ? 'orange' : 'default'
                      }>
                        {selectedUser.status === 'high_intent' ? '高意向' : 
                         selectedUser.status === 'medium_intent' ? '中意向' : '低意向'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="标签">
                      <Space wrap>
                        {selectedUser.tags.map((tag: string) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'behavior',
                label: '行为记录',
                children: (
                  <Timeline
                    items={[
                      { color: 'green', children: '2026-03-05 14:30 访问网站，使用成本计算器' },
                      { color: 'green', children: '2026-03-04 10:20 访问网站，使用时间估算工具' },
                      { color: 'green', children: '2026-03-03 16:45 访问网站，查看政策查询' },
                      { color: 'green', children: '2026-03-02 09:15 提交询盘表单' },
                    ]}
                  />
                ),
              },
              {
                key: 'followup',
                label: '跟进记录',
                children: (
                  <Timeline
                    items={[
                      { color: 'blue', children: '2026-03-05 15:00 销售跟进：客户表示预算有限，需要更详细方案' },
                      { color: 'blue', children: '2026-03-04 11:30 已分配给销售张强' },
                      { color: 'blue', children: '2026-03-03 18:00 系统自动分配线索' },
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  )
}
