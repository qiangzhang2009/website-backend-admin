/**
 * 询盘管理页面 - 真实数据版
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Table, Card, Input, Select, Button, Space, Tag, Form, Drawer, Modal, message, Empty } from 'antd'
import { SearchOutlined, PlusOutlined, ExportOutlined, PhoneOutlined, MessageOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Option } = Select
const { TextArea } = Input

// 从 URL 参数获取当前租户
function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || ''
}

interface Inquiry {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  company: string | null
  product_type: string | null
  target_market: string | null
  message: string | null
  status: string
  priority: string | null
  assignee: string | null
  source: string | null
  created_at: string
  updated_at: string
}

export default function InquiriesPage() {
  const TENANT = useTenantFromURL()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [form] = Form.useForm()
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  const fetchInquiries = useCallback(async (status?: string, pg = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        tenant: TENANT,
        limit: String(pageSize),
        offset: String((pg - 1) * pageSize),
      })
      if (status) params.set('status', status)
      const res = await fetch(`/api/admin/inquiries?${params}`)
      const data = await res.json()
      setInquiries(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      console.error('Inquiries fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  useEffect(() => { fetchInquiries() }, [fetchInquiries, TENANT])

  const handleSave = async () => {
    if (!selectedInquiry) return
    setSaving(true)
    try {
      const values = form.getFieldsValue()
      await fetch(`/api/admin/inquiries?tenant=${TENANT}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedInquiry.id, ...values }),
      })
      message.success('保存成功')
      setDrawerVisible(false)
      fetchInquiries(statusFilter, page)
    } catch (e) {
      message.error('保存失败')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    setCreateLoading(true)
    try {
      const values = await form.validateFields()
      await fetch(`/api/admin/inquiries?tenant=${TENANT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      message.success('创建成功')
      setCreateModalVisible(false)
      form.resetFields()
      fetchInquiries()
    } catch (e) {
      message.error('创建失败')
      console.error(e)
    } finally {
      setCreateLoading(false)
    }
  }

  const columns = [
    {
      title: '联系人',
      key: 'contact',
      width: 160,
      render: (_: unknown, r: Inquiry) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{r.name || '匿名'}</span>
          {r.company && <span style={{ color: '#888', fontSize: 12 }}>{r.company}</span>}
        </Space>
      ),
    },
    {
      title: '电话/邮箱',
      key: 'contact_info',
      width: 170,
      render: (_: unknown, r: Inquiry) => (
        <Space direction="vertical" size={0}>
          {r.phone && <span>{r.phone}</span>}
          {r.email && <span style={{ color: '#888', fontSize: 12 }}>{r.email}</span>}
          {!r.phone && !r.email && <span style={{ color: '#ccc' }}>未留联系方式</span>}
        </Space>
      ),
    },
    {
      title: '产品/市场',
      key: 'product_market',
      width: 140,
      render: (_: unknown, r: Inquiry) => (
        <Space direction="vertical" size={0}>
          {r.product_type && <Tag>{r.product_type}</Tag>}
          {r.target_market && <Tag color="blue">{r.target_market}</Tag>}
        </Space>
      ),
    },
    {
      title: '需求描述',
      dataIndex: 'message',
      key: 'message',
      width: 200,
      ellipsis: true,
      render: (v: string | null) => v || '-',
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (v: string | null) => v ? <Tag color="purple">{v}</Tag> : '-',
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (p: string | null) => {
        const colorMap: Record<string, string> = { high: 'red', medium: 'orange', low: 'default' }
        const textMap: Record<string, string> = { high: '高', medium: '中', low: '低' }
        if (!p) return '-'
        return <Tag color={colorMap[p] || 'default'}>{textMap[p] || p}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
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
      render: (v: string | null) => v || <span style={{ color: '#ccc' }}>未分配</span>,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100,
      render: (v: string) => dayjs(v).fromNow(),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: Inquiry) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedInquiry(record)
              form.setFieldsValue({ status: record.status, priority: record.priority, assignee: record.assignee })
              setDrawerVisible(true)
            }}
          >
            跟进
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="全部状态"
              allowClear
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); fetchInquiries(v, 1) }}
              style={{ width: 120 }}
            >
              <Option value="pending">待处理</Option>
              <Option value="following">跟进中</Option>
              <Option value="completed">已成交</Option>
              <Option value="failed">已流失</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={() => { setStatusFilter(undefined); setPage(1); fetchInquiries(undefined, 1) }}>
              重置
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>新建询盘</Button>
            <Button icon={<ExportOutlined />} onClick={() => {
              const url = `/api/admin/export?tenant=${TENANT}&type=inquiries`
              window.open(url, '_blank')
            }}>导出</Button>
            <span style={{ color: '#888' }}>共 {total} 条询盘</span>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={inquiries}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description="暂无询盘数据，等待用户通过网站表单提交" /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p) => { setPage(p); fetchInquiries(statusFilter, p) },
          }}
        />
      </Card>

      <Drawer
        title={`询盘详情 - ${selectedInquiry?.name || '匿名'}`}
        placement="right"
        width={500}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        extra={
          <Button type="primary" loading={saving} onClick={handleSave}>保存</Button>
        }
      >
        {selectedInquiry && (
          <div>
            <div style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              <h3 style={{ margin: '0 0 4px' }}>{selectedInquiry.name || '匿名用户'}</h3>
              <p style={{ margin: '0 0 8px', color: '#666' }}>{selectedInquiry.company || '未填写公司'}</p>
              <Space>
                {selectedInquiry.product_type && <Tag>{selectedInquiry.product_type}</Tag>}
                {selectedInquiry.target_market && <Tag color="blue">{selectedInquiry.target_market}</Tag>}
              </Space>
              {selectedInquiry.message && (
                <p style={{ margin: '12px 0 0', color: '#333', fontSize: 13 }}>{selectedInquiry.message}</p>
              )}
            </div>

            <Form form={form} layout="vertical">
              <Form.Item label="处理状态" name="status">
                <Select>
                  <Option value="pending">待处理</Option>
                  <Option value="following">跟进中</Option>
                  <Option value="completed">已成交</Option>
                  <Option value="failed">已流失</Option>
                </Select>
              </Form.Item>
              <Form.Item label="优先级" name="priority">
                <Select allowClear placeholder="设置优先级">
                  <Option value="high">高优先级</Option>
                  <Option value="medium">中优先级</Option>
                  <Option value="low">低优先级</Option>
                </Select>
              </Form.Item>
              <Form.Item label="负责人" name="assignee">
                <Select allowClear placeholder="分配给...">
                  <Option value="张强">张强</Option>
                  <Option value="李静">李静</Option>
                  <Option value="刘潇">刘潇</Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button icon={<PhoneOutlined />}>{selectedInquiry.phone || '未留电话'}</Button>
                  <Button icon={<MessageOutlined />}>{selectedInquiry.email || '未留邮箱'}</Button>
                </Space>
              </Form.Item>
              <Form.Item label="跟进备注">
                <TextArea rows={3} placeholder="记录本次跟进情况..." />
              </Form.Item>
            </Form>

            <div style={{ fontSize: 12, color: '#999', marginTop: 16 }}>
              <div>创建时间：{dayjs(selectedInquiry.created_at).format('YYYY-MM-DD HH:mm')}</div>
              <div>更新时间：{dayjs(selectedInquiry.updated_at).format('YYYY-MM-DD HH:mm')}</div>
              <div>来源渠道：{selectedInquiry.source || '未知'}</div>
            </div>
          </div>
        )}
      </Drawer>

      {/* 新建询盘弹窗 */}
      <Modal
        title="新建询盘"
        open={createModalVisible}
        onCancel={() => { setCreateModalVisible(false); form.resetFields() }}
        footer={[
          <Button key="cancel" onClick={() => setCreateModalVisible(false)}>取消</Button>,
          <Button key="submit" type="primary" loading={createLoading} onClick={handleCreate}>创建</Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item label="电话" name="phone">
            <Input placeholder="请输入电话" />
          </Form.Item>
          <Form.Item label="邮箱" name="email">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item label="公司" name="company">
            <Input placeholder="请输入公司名称" />
          </Form.Item>
          <Form.Item label="产品类型" name="product_type">
            <Input placeholder="请输入产品类型" />
          </Form.Item>
          <Form.Item label="目标市场" name="target_market">
            <Input placeholder="请输入目标市场" />
          </Form.Item>
          <Form.Item label="需求描述" name="message">
            <TextArea rows={3} placeholder="请输入需求描述" />
          </Form.Item>
          <Form.Item label="来源" name="source" initialValue="manual">
            <Select placeholder="选择来源">
              <Option value="manual">手动录入</Option>
              <Option value="website_form">网站表单</Option>
              <Option value="phone">电话咨询</Option>
              <Option value="referral">客户推荐</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
