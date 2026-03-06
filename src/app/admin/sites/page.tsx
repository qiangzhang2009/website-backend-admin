/**
 * 多网站配置管理后台
 * 统一管理多个网站的配置、数据和功能模块
 */

'use client'

import { useState } from 'react'
import { Card, Row, Col, Table, Tag, Button, Space, Modal, Form, Input, Select, Badge, Statistic, Drawer, Descriptions, Timeline } from 'antd'
import { PlusOutlined, SettingOutlined, GlobalOutlined, BarChartOutlined, ToolOutlined, UserOutlined, MessageOutlined, EyeOutlined, DeleteOutlined, CopyOutlined, ExportOutlined } from '@ant-design/icons'

const { Option } = Select
const { TextArea } = Input

// 模拟网站数据
const mockWebsites = [
  {
    id: '1',
    name: '张小强企业咨询',
    slug: 'zxqconsulting',
    domain: 'www.zxqconsulting.com',
    status: 'active',
    createdAt: '2025-06-15',
    plan: 'enterprise',
    users: 1250,
    inquiries: 456,
    pageViews: 125680,
    features: ['userProfile', 'inquiry', 'analytics', 'tools'],
  },
  {
    id: '2',
    name: '中医药出海网',
    slug: 'tcm-export',
    domain: 'www.tcm-export.com',
    status: 'active',
    createdAt: '2025-09-20',
    plan: 'business',
    users: 680,
    inquiries: 234,
    pageViews: 68200,
    features: ['userProfile', 'inquiry', 'analytics'],
  },
  {
    id: '3',
    name: '医疗器械出海',
    slug: 'medical-export',
    domain: 'www.medical-export.cn',
    status: 'active',
    createdAt: '2025-11-10',
    plan: 'business',
    users: 420,
    inquiries: 156,
    pageViews: 45600,
    features: ['userProfile', 'inquiry', 'analytics', 'tools'],
  },
  {
    id: '4',
    name: '食品出口咨询',
    slug: 'food-consult',
    domain: 'www.food-consult.com',
    status: 'paused',
    createdAt: '2025-12-01',
    plan: 'starter',
    users: 89,
    inquiries: 23,
    pageViews: 8900,
    features: ['userProfile', 'inquiry'],
  },
  {
    id: '5',
    name: '化妆品出海平台',
    slug: 'cosmetic-global',
    domain: null,
    status: 'pending',
    createdAt: '2026-03-01',
    plan: 'trial',
    users: 0,
    inquiries: 0,
    pageViews: 0,
    features: ['userProfile'],
  },
]

// 套餐配置
const plans = [
  { key: 'trial', name: '试用版', price: '免费', features: ['基础追踪', '100用户', '1网站'] },
  { key: 'starter', name: '基础版', price: '¥999/月', features: ['基础追踪', '1000用户', '3网站', '基础分析'] },
  { key: 'business', name: '商业版', price: '¥2999/月', features: ['完整追踪', '5000用户', '10网站', '高级分析', '线索评分'] },
  { key: 'enterprise', name: '企业版', price: '¥9999/月', features: ['完整追踪', '无限用户', '无限网站', '高级分析', 'ML预测', '专属客服'] },
]

// 功能模块
const featureModules = [
  { key: 'userProfile', name: '用户画像', description: '360°用户行为分析', icon: <UserOutlined /> },
  { key: 'inquiry', name: '询盘管理', description: '线索获取和跟进', icon: <MessageOutlined /> },
  { key: 'analytics', name: '数据分析', description: '流量和转化分析', icon: <BarChartOutlined /> },
  { key: 'tools', name: '工具数据', description: '网站工具使用分析', icon: <ToolOutlined /> },
]

// 模拟最近活动
const mockActivities = [
  { time: '2026-03-05 14:30', action: '新增用户', target: 'zxqconsulting', detail: '+12 用户' },
  { time: '2026-03-05 11:20', action: '询盘提交', target: 'tcm-export', detail: '新询盘来自日本' },
  { time: '2026-03-04 16:45', action: '功能配置', target: 'medical-export', detail: '开启工具数据模块' },
  { time: '2026-03-04 09:00', action: '续费通知', target: 'zxqconsulting', detail: '企业版即将到期' },
]

type BadgeStatus = 'success' | 'processing' | 'error' | 'default' | 'warning'

type Website = typeof mockWebsites[0]

const columns = [
  {
    title: '网站',
    key: 'website',
    render: (_: unknown, r: Website) => (
      <Space>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GlobalOutlined style={{ color: '#fff', fontSize: 18 }} />
        </div>
        <div>
          <div style={{ fontWeight: 500 }}>{r.name}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{r.slug}</div>
        </div>
      </Space>
    ),
  },
  {
    title: '域名',
    dataIndex: 'domain',
    render: (d: string) => d || <Tag>未绑定</Tag>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    render: (s: string) => {
      const map: Record<string, { color: BadgeStatus; text: string }> = {
        active: { color: 'success', text: '运行中' },
        paused: { color: 'warning', text: '已暂停' },
        pending: { color: 'default', text: '待激活' },
      }
      return <Badge status={map[s].color} text={map[s].text} />
    },
  },
  {
    title: '套餐',
    dataIndex: 'plan',
    render: (p: string) => {
      const plan = plans.find(pl => pl.key === p)
      return <Tag>{plan?.name}</Tag>
    },
  },
  {
    title: '数据概览',
    key: 'stats',
    render: (_: unknown, r: Website) => (
      <Space size="large">
        <div><UserOutlined /> {r.users}</div>
        <div><MessageOutlined /> {r.inquiries}</div>
        <div><EyeOutlined /> {(r.pageViews/1000).toFixed(1)}k</div>
      </Space>
    ),
  },
  {
    title: '功能',
    dataIndex: 'features',
    render: (f: string[]) => (
      <Space wrap>
        {f.map(feat => {
          const featureModule = featureModules.find(m => m.key === feat)
          return <Tag key={feat} icon={featureModule?.icon}>{featureModule?.name}</Tag>
        })}
      </Space>
    ),
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
        <Button type="link" icon={<SettingOutlined />}>配置</Button>
        <Button type="link" icon={<BarChartOutlined />}>数据</Button>
        <Button type="link" danger icon={<DeleteOutlined />} />
      </Space>
    ),
  },
]

export default function MultiSitePage() {
  const [modalVisible, setModalVisible] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [selectedSite, setSelectedSite] = useState<Website | null>(null)

  const stats = {
    totalSites: mockWebsites.length,
    activeSites: mockWebsites.filter(w => w.status === 'active').length,
    totalUsers: mockWebsites.reduce((sum, w) => sum + w.users, 0),
    totalInquiries: mockWebsites.reduce((sum, w) => sum + w.inquiries, 0),
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>多网站管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          添加网站
        </Button>
      </div>

      {/* 统计概览 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={6}>
          <Card>
            <Statistic title="网站总数" value={stats.totalSites} prefix={<GlobalOutlined />} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card>
            <Statistic title="活跃网站" value={stats.activeSites} prefix={<Badge status="success" />} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card>
            <Statistic title="总用户数" value={stats.totalUsers} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card>
            <Statistic title="总询盘数" value={stats.totalInquiries} prefix={<MessageOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 网站列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={mockWebsites}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          onRow={record => ({
            onClick: () => {
              setSelectedSite(record as Website)
              setDrawerVisible(true)
            },
          })}
        />
      </Card>

      {/* 最近活动 */}
      <Card title="最近活动" style={{ marginTop: 16 }}>
        <Timeline
          items={mockActivities.map(a => ({
            color: a.action.includes('新增') ? 'green' : a.action.includes('询盘') ? 'blue' : 'gray',
            children: (
              <div>
                <div>{a.time}</div>
                <div>
                  <Tag>{a.action}</Tag>
                  <span>{a.target}</span>
                  <span style={{ color: '#888' }}> - {a.detail}</span>
                </div>
              </div>
            ),
          }))}
        />
      </Card>

      {/* 套餐配置 */}
      <Card title="套餐配置" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          {plans.map(plan => (
            <Col xs={24} md={6} key={plan.key}>
              <Card 
                size="small" 
                title={plan.name}
                extra={<Tag>{plan.price}</Tag>}
              >
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ marginBottom: 4 }}>{f}</li>
                  ))}
                </ul>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 添加网站弹窗 */}
      <Modal
        title="添加新网站"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="网站名称" required>
            <Input placeholder="请输入网站名称" />
          </Form.Item>
          <Form.Item label="租户标识" required>
            <Input placeholder="如: my-website" />
          </Form.Item>
          <Form.Item label="绑定域名">
            <Input placeholder="如: www.example.com（可选）" />
          </Form.Item>
          <Form.Item label="选择套餐">
            <Select placeholder="选择套餐">
              {plans.map(p => (
                <Option key={p.key} value={p.key}>{p.name} - {p.price}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="启用功能">
            <Select mode="multiple" placeholder="选择功能模块">
              {featureModules.map(m => (
                <Option key={m.key} value={m.key}>{m.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={() => setModalVisible(false)}>创建网站</Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 网站详情抽屉 */}
      <Drawer
        title={selectedSite?.name}
        placement="right"
        width={500}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedSite && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions column={1}>
                <Descriptions.Item label="租户标识">{selectedSite.slug}</Descriptions.Item>
                <Descriptions.Item label="域名">{selectedSite.domain || '未绑定'}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Badge status={selectedSite.status === 'active' ? 'success' : 'warning'} text={selectedSite.status} />
                </Descriptions.Item>
                <Descriptions.Item label="套餐">{plans.find(p => p.key === selectedSite.plan)?.name}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{selectedSite.createdAt}</Descriptions.Item>
              </Descriptions>
            </Card>
            
            <Card title="数据统计" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="用户" value={selectedSite.users} />
                </Col>
                <Col span={8}>
                  <Statistic title="询盘" value={selectedSite.inquiries} />
                </Col>
                <Col span={8}>
                  <Statistic title="浏览量" value={selectedSite.pageViews} />
                </Col>
              </Row>
            </Card>

            <Card title="嵌入代码" style={{ marginBottom: 16 }}>
              <TextArea 
                value={`<script src="https://your-domain.com/api/tracking?tenant=${selectedSite.slug}"></script>`}
                rows={3}
                readOnly
              />
              <Button type="link" icon={<CopyOutlined />}>复制代码</Button>
            </Card>

            <Space>
              <Button icon={<SettingOutlined />}>功能配置</Button>
              <Button icon={<BarChartOutlined />}>查看数据</Button>
              <Button icon={<ExportOutlined />}>导出数据</Button>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  )
}
