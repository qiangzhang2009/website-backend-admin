/**
 * 多网站配置管理后台
 * 多彩渐变设计风格
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Row, Col, Table, Tag, Button, Space, Modal, Form, Input, Select, Badge, Drawer, Descriptions, message, Spin, Alert } from 'antd'
import { PlusOutlined, SettingOutlined, GlobalOutlined, BarChartOutlined, ToolOutlined, UserOutlined, MessageOutlined, EyeOutlined, DeleteOutlined, CopyOutlined, ReloadOutlined, ExportOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useTheme } from '@/components/AdminLayout'

const { Option } = Select
const { TextArea } = Input

const featureModules = [
  { key: 'userProfile', name: '用户画像', icon: <UserOutlined /> },
  { key: 'inquiry', name: '询盘管理', icon: <MessageOutlined /> },
  { key: 'analytics', name: '数据分析', icon: <BarChartOutlined /> },
  { key: 'tools', name: '工具数据', icon: <ToolOutlined /> },
]

interface SiteRecord {
  id: string
  name: string
  slug: string
  domain: string | null
  timezone: string
  language: string
  settings: { features?: Record<string, boolean> }
  created_at: string
  users: string
  inquiries: string
  page_views: string
  url?: string // 实际网站访问地址
}

// 租户 slug 到实际网站 URL 的映射
const TENANT_URLS: Record<string, string> = {
  'zxqconsulting': 'https://zxqconsulting-web1-ixh7elg6g-johnzhangs-projects-50e83ec4.vercel.app',
  'zero': 'https://zero2-80h93287m-johnzhangs-projects-50e83ec4.vercel.app',
  'import-website': 'https://import-website-86vsj0u9d-johnzhangs-projects-50e83ec4.vercel.app',
  'global2china': 'https://global2china.zxqconsulting.com',
  'africa': 'https://africa.zxqconsulting.com',
  'starloom': 'https://starloom.vercel.app',
}

// 多彩统计卡片配置
const STAT_CARDS = [
  { key: 'totalSites', label: '网站总数', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', icon: '🌐' },
  { key: 'activeSites', label: '活跃网站', gradient: 'linear-gradient(135deg, #10b981, #059669)', icon: '✅' },
  { key: 'totalUsers', label: '总用户', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', icon: '👥' },
  { key: 'totalInquiries', label: '总询盘', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: '💬' },
  { key: 'totalPageViews', label: '总浏览量', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', icon: '👁️' },
]

export default function MultiSitePage() {
  const { textMuted, textPrimary, textSecondary } = useTheme()
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

  useEffect(() => { fetchSites() }, [fetchSites])

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
    Object.entries(site.settings?.features ?? {}).filter(([, v]) => v).map(([k]) => k)

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
      render: (_: unknown, r: SiteRecord) => {
        const siteUrl = r.url || TENANT_URLS[r.slug] || null
        return (
          <Space>
            <div 
              style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 8, 
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: siteUrl ? 'pointer' : 'default',
              }}
              onClick={(e) => {
                if (siteUrl) {
                  e.stopPropagation()
                  window.open(siteUrl, '_blank')
                }
              }}
              title={siteUrl ? '点击访问网站' : '未配置访问地址'}
            >
              <GlobalOutlined style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontWeight: 500, color: textPrimary, cursor: siteUrl ? 'pointer' : 'default' }} onClick={() => siteUrl && window.open(siteUrl, '_blank')}>
                {r.name}
                {siteUrl && <sup style={{ color: '#10b981', marginLeft: 4 }}>↗</sup>}
              </div>
              <div style={{ fontSize: 12, color: textMuted }}>{r.slug}</div>
            </div>
          </Space>
        )
      },
    },
    {
      title: '域名',
      dataIndex: 'domain',
      render: (d: string | null) => d || <Tag>未绑定</Tag>,
    },
    {
      title: '状态',
      key: 'status',
      render: () => <Badge status="success" text={<span style={{ color: '#10b981' }}>运行中</span>} />,
    },
    {
      title: '数据概览',
      key: 'stats',
      render: (_: unknown, r: SiteRecord) => (
        <Space size="large">
          <div><UserOutlined style={{ color: '#06b6d4' }} /> <span style={{ color: '#06b6d4', fontWeight: 500 }}>{Number(r.users)}</span></div>
          <div><MessageOutlined style={{ color: '#f59e0b' }} /> <span style={{ color: '#f59e0b', fontWeight: 500 }}>{Number(r.inquiries)}</span></div>
          <div><EyeOutlined style={{ color: '#3b82f6' }} /> <span style={{ color: '#3b82f6', fontWeight: 500 }}>{(Number(r.page_views) / 1000).toFixed(1)}k</span></div>
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
            return <Tag key={feat} icon={mod?.icon} color="purple">{mod?.name ?? feat}</Tag>
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
      render: (_: unknown, r: SiteRecord) => {
        const siteUrl = r.url || TENANT_URLS[r.slug] || null
        return (
          <Space>
            {siteUrl && (
              <Button 
                type="link" 
                icon={<GlobalOutlined />} 
                onClick={e => { e.stopPropagation(); window.open(siteUrl, '_blank') }}
                style={{ color: '#10b981' }}
              >
                访问
              </Button>
            )}
            <Button type="link" icon={<SettingOutlined />} onClick={e => { e.stopPropagation(); setSelectedSite(r); setDrawerVisible(true) }}>配置</Button>
            <Link href={`/admin/analytics?tenant=${r.slug}`}>
              <Button type="link" icon={<BarChartOutlined />} onClick={e => e.stopPropagation()}>数据</Button>
            </Link>
            <Button type="link" danger icon={<DeleteOutlined />} onClick={e => { e.stopPropagation(); message.info('删除功能开发中') }} />
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>多网站管理</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchSites} loading={loading}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>添加网站</Button>
        </Space>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      {/* 多彩统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {STAT_CARDS.map(card => {
          const value = stats[card.key as keyof typeof stats]
          return (
            <Col xs={12} sm={8} lg={4} key={card.key}>
              <Card hoverable style={{ background: card.gradient, border: 'none' }} bodyStyle={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ color: '#fff' }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{card.icon}</div>
                  <div style={{ opacity: 0.9, fontSize: 12 }}>{card.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      <Card>
        <Spin spinning={loading}>
          <Table columns={columns} dataSource={sites} rowKey="id" pagination={{ pageSize: 10 }} locale={{ emptyText: loading ? '加载中...' : '暂无网站数据' }} onRow={record => ({ onClick: () => { setSelectedSite(record); setDrawerVisible(true) } })} />
        </Spin>
      </Card>

      <Modal title="添加新网站" open={modalVisible} onCancel={() => { setModalVisible(false); form.resetFields() }} onOk={handleAddSite} confirmLoading={submitting} okText="创建网站" cancelText="取消" width={600}>
        <Form form={form} layout="vertical">
          <Form.Item label="网站名称" name="name" rules={[{ required: true, message: '请输入网站名称' }]}>
            <Input placeholder="如: 中医药出海网" />
          </Form.Item>
          <Form.Item label="租户标识 (slug)" name="slug" rules={[{ required: true, message: '请输入租户标识' }, { pattern: /^[a-z0-9-]+$/, message: '只能使用小写字母、数字和连字符' }]}>
            <Input placeholder="如: tcm-export" />
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
              {featureModules.map(m => (<Option key={m.key} value={m.key}>{m.name}</Option>))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title={selectedSite?.name} placement="right" width={500} open={drawerVisible} onClose={() => setDrawerVisible(false)}>
        {selectedSite && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions column={1}>
                <Descriptions.Item label="租户标识">{selectedSite.slug}</Descriptions.Item>
                <Descriptions.Item label="域名">{selectedSite.domain || '未绑定'}</Descriptions.Item>
                <Descriptions.Item label="状态"><Badge status="success" text={<span style={{ color: '#10b981' }}>运行中</span>} /></Descriptions.Item>
                <Descriptions.Item label="时区">{selectedSite.timezone}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{new Date(selectedSite.created_at).toLocaleString('zh-CN')}</Descriptions.Item>
              </Descriptions>
            </Card>
            <Card title="数据统计" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, color: '#06b6d4', fontWeight: 700 }}>{Number(selectedSite.users)}</div><div style={{ fontSize: 12, color: textMuted }}>用户</div></div></Col>
                <Col span={8}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, color: '#f59e0b', fontWeight: 700 }}>{Number(selectedSite.inquiries)}</div><div style={{ fontSize: 12, color: textMuted }}>询盘</div></div></Col>
                <Col span={8}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, color: '#3b82f6', fontWeight: 700 }}>{Number(selectedSite.page_views)}</div><div style={{ fontSize: 12, color: textMuted }}>浏览量</div></div></Col>
              </Row>
            </Card>
            <Card title="启用功能" style={{ marginBottom: 16 }}>
              <Space wrap>
                {getFeatureKeys(selectedSite).map(feat => {
                  const mod = featureModules.find(m => m.key === feat)
                  return <Tag key={feat} icon={mod?.icon} color="purple">{mod?.name ?? feat}</Tag>
                })}
                {getFeatureKeys(selectedSite).length === 0 && <span style={{ color: textMuted }}>未启用任何功能</span>}
              </Space>
            </Card>
            <Card title="嵌入代码" style={{ marginBottom: 16 }}>
              <TextArea value={`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/tracking?tenant=${selectedSite.slug}"></script>`} rows={3} readOnly />
              <Button type="link" icon={<CopyOutlined />} onClick={() => { const code = `<script src="${window.location.origin}/api/tracking?tenant=${selectedSite.slug}"></script>`; navigator.clipboard.writeText(code).then(() => message.success('已复制')) }}>
                复制代码
              </Button>
            </Card>
            <Space wrap style={{ marginBottom: 16 }}>
              {(() => {
                const siteUrl = selectedSite.url || TENANT_URLS[selectedSite.slug] || null
                return siteUrl ? (
                  <Button 
                    type="primary" 
                    icon={<GlobalOutlined />} 
                    onClick={() => window.open(siteUrl, '_blank')}
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                  >
                    访问网站
                  </Button>
                ) : null
              })()}
              <Link href={`/admin/settings?tenant=${selectedSite.slug}`}><Button icon={<SettingOutlined />}>功能配置</Button></Link>
              <Link href={`/admin/analytics?tenant=${selectedSite.slug}`}><Button icon={<BarChartOutlined />}>查看数据</Button></Link>
              <Button icon={<ExportOutlined />} onClick={() => message.info('导出功能开发中')}>导出数据</Button>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  )
}
