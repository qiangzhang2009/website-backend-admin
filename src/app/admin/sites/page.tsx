/**
 * 多网站配置管理后台
 * 统一管理多个网站的配置、数据和功能模块
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Row, Col, Table, Tag, Button, Space, Modal, Form, Input, Select, Badge, Statistic, Drawer, Descriptions, message, Spin, Alert } from 'antd'
import { PlusOutlined, SettingOutlined, GlobalOutlined, BarChartOutlined, ToolOutlined, UserOutlined, MessageOutlined, EyeOutlined, DeleteOutlined, CopyOutlined, ExportOutlined, ReloadOutlined } from '@ant-design/icons'

const { Option } = Select
const { TextArea } = Input

// 套餐配置
const plans = [
  { key: 'trial', name: '试用版', price: '免费', features: ['基础追踪', '100用户', '1网站'] },
  { key: 'starter', name: '基础版', price: '¥999/月', features: ['基础追踪', '1000用户', '3网站', '基础分析'] },
  { key: 'business', name: '商业版', price: '¥2999/月', features: ['完整追踪', '5000用户', '10网站', '高级分析', '线索评分'] },
  { key: 'enterprise', name: '企业版', price: '¥9999/月', features: ['完整追踪', '无限用户', '无限网站', '高级分析', 'ML预测', '专属客服'] },
]

// 功能模块
const featureModules = [
  { key: 'userProfile', name: '用户画像', icon: <UserOutlined /> },
  { key: 'inquiry', name: '询盘管理', icon: <MessageOutlined /> },
  { key: 'analytics', name: '数据分析', icon: <BarChartOutlined /> },
  { key: 'tools', name: '工具数据', icon: <ToolOutlined /> },
]

// 从数据库返回的租户数据结构
interface SiteRecord {
  id: string
  name: string
  slug: string
  domain: string | null
  timezone: string
  language: string
  settings: { features?: Record<string, boolean> }
  created_at: string
  users: string  // 数据库返回的是字符串
  inquiries: string
  page_views: string
}

type BadgeStatus = 'success' | 'processing' | 'error' | 'default' | 'warning'

export default function MultiSitePage() {
  const [sites, setSites] = useState<SiteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [selectedSite, setSelectedSite] = useState<SiteRecord | null>(null)
  const [form] = Form.useForm()

  const fetchSites = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/sites')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSites(data.sites ?? [])
    } catch (err) {
      setError('加载网站列表失败，请刷新重试')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSites()
  }, [fetchSites])

  const handleAddSite = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const features: Record<string, boolean> = {}
      ;(values.features as string[] ?? []).forEach((k: string) => { features[k] = true })

      const res = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, features }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '创建失败')
      }

      message.success('网站创建成功')
      setModalVisible(false)
      form.resetFields()
      fetchSites()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getFeatureKeys = (site: SiteRecord): string[] =>
    Object.entries(site.settings?.features ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k)

  const stats = {
    totalSites: sites.length,
    activeSites: sites.filter(s => Number(s.page_views) > 0).length,
    totalUsers: sites.reduce((sum, w) => sum + Number(w.users), 0),
    totalInquiries: sites.reduce((sum, w) => sum + Number(w.inquiries), 0),
    totalPageViews: sites.reduce((sum, w) => sum + Number(w.page_views), 0),
  }

  const columns = [
    {
      title: '网站',
      key: 'website',
      render: (_: unknown, r: SiteRecord) => (
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
      render: (d: string | null) => d || <Tag>未绑定</Tag>,
    },
    {
      title: '状态',
      key: 'status',
      render: () => {
        const map: Record<string, { color: BadgeStatus; text: string }> = {
          active: { color: 'success', text: '运行中' },
        }
        return <Badge status={map['active'].color} text={map['active'].text} />
      },
    },
    {
      title: '数据概览',
      key: 'stats',
      render: (_: unknown, r: SiteRecord) => (
        <Space size="large">
          <div><UserOutlined /> {Number(r.users)}</div>
          <div><MessageOutlined /> {Number(r.inquiries)}</div>
          <div><EyeOutlined /> {(Number(r.page_views) / 1000).toFixed(1)}k</div>
        </Space>
      ),
    },
    {
      title: '功能',
      key: 'features',
      render: (_: unknown, r: SiteRecord) => (
        <Space wrap>
          {getFeatureKeys(r).map(feat => {
            const mod = featureModules.find(m => m.key === feat)
            return <Tag key={feat} icon={mod?.icon}>{mod?.name ?? feat}</Tag>
          })}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      render: (v: string) => new Date(v).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, r: SiteRecord) => (
        <Space>
          <Button type="link" icon={<SettingOutlined />} onClick={e => { e.stopPropagation(); setSelectedSite(r); setDrawerVisible(true) }}>配置</Button>
          <Button type="link" icon={<BarChartOutlined />}>数据</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={e => e.stopPropagation()} />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>多网站管理</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchSites} loading={loading}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            添加网站
          </Button>
        </Space>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

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
        <Col xs={6}>
          <Card>
            <Statistic title="总浏览量" value={stats.totalPageViews} prefix={<EyeOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 网站列表 */}
      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={sites}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: loading ? '加载中...' : '暂无网站数据' }}
            onRow={record => ({
              onClick: () => {
                setSelectedSite(record)
                setDrawerVisible(true)
              },
            })}
          />
        </Spin>
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
        onCancel={() => { setModalVisible(false); form.resetFields() }}
        onOk={handleAddSite}
        confirmLoading={submitting}
        okText="创建网站"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="网站名称" name="name" rules={[{ required: true, message: '请输入网站名称' }]}>
            <Input placeholder="如: 中医药出海网" />
          </Form.Item>
          <Form.Item
            label="租户标识 (slug)"
            name="slug"
            rules={[
              { required: true, message: '请输入租户标识' },
              { pattern: /^[a-z0-9-]+$/, message: '只能使用小写字母、数字和连字符' },
            ]}
          >
            <Input placeholder="如: tcm-export（只允许小写字母、数字和连字符）" />
          </Form.Item>
          <Form.Item label="绑定域名" name="domain">
            <Input placeholder="如: www.example.com（可选）" />
          </Form.Item>
          <Form.Item label="时区" name="timezone" initialValue="Asia/Shanghai">
            <Select>
              <Option value="Asia/Shanghai">亚洲/上海 (UTC+8)</Option>
              <Option value="UTC">UTC</Option>
              <Option value="America/New_York">美国/纽约 (UTC-5)</Option>
            </Select>
          </Form.Item>
          <Form.Item label="启用功能" name="features">
            <Select mode="multiple" placeholder="选择功能模块">
              {featureModules.map(m => (
                <Option key={m.key} value={m.key}>{m.name}</Option>
              ))}
            </Select>
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
                  <Badge status="success" text="运行中" />
                </Descriptions.Item>
                <Descriptions.Item label="时区">{selectedSite.timezone}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{new Date(selectedSite.created_at).toLocaleString('zh-CN')}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="数据统计" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="用户" value={Number(selectedSite.users)} />
                </Col>
                <Col span={8}>
                  <Statistic title="询盘" value={Number(selectedSite.inquiries)} />
                </Col>
                <Col span={8}>
                  <Statistic title="浏览量" value={Number(selectedSite.page_views)} />
                </Col>
              </Row>
            </Card>

            <Card title="启用功能" style={{ marginBottom: 16 }}>
              <Space wrap>
                {getFeatureKeys(selectedSite).map(feat => {
                  const mod = featureModules.find(m => m.key === feat)
                  return <Tag key={feat} icon={mod?.icon} color="blue">{mod?.name ?? feat}</Tag>
                })}
                {getFeatureKeys(selectedSite).length === 0 && <span style={{ color: '#999' }}>未启用任何功能</span>}
              </Space>
            </Card>

            <Card title="嵌入代码" style={{ marginBottom: 16 }}>
              <TextArea
                value={`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/tracking?tenant=${selectedSite.slug}"></script>`}
                rows={3}
                readOnly
              />
              <Button
                type="link"
                icon={<CopyOutlined />}
                onClick={() => {
                  const code = `<script src="${window.location.origin}/api/tracking?tenant=${selectedSite.slug}"></script>`
                  navigator.clipboard.writeText(code).then(() => message.success('已复制'))
                }}
              >
                复制代码
              </Button>
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
