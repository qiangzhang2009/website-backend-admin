/**
 * 用户列表页面 - 真实数据版
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Table, Card, Input, Select, Button, Space, Tag, Modal, Descriptions, Tabs, Spin, Empty, message } from 'antd'
import { SearchOutlined, EyeOutlined, ExportOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Option } = Select

// 从 URL 参数获取当前租户
function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || ''
}

interface User {
  id: string
  visitor_id: string
  name: string | null
  phone: string | null
  email: string | null
  company: string | null
  product_type: string | null
  target_market: string | null
  source: string | null
  inquiry_count: number
  visit_count: number
  first_visit_at: string | null
  last_visit_at: string | null
  first_inquiry_at: string | null
  last_inquiry_at: string | null
  created_at: string
}

function intentLevel(u: User): { color: string; text: string } {
  if (u.inquiry_count > 0 && u.visit_count > 5) return { color: 'red', text: '高意向' }
  if (u.inquiry_count > 0 || u.visit_count > 3) return { color: 'orange', text: '中意向' }
  return { color: 'default', text: '低意向' }
}

export default function UsersPage() {
  const TENANT = useTenantFromURL()
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [searchText, setSearchText] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  const fetchUsers = useCallback(async (search?: string, pg = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        tenant: TENANT,
        limit: String(pageSize),
        offset: String((pg - 1) * pageSize),
      })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      setUsers(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      console.error('Users fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  useEffect(() => { fetchUsers() }, [fetchUsers, TENANT])

  const handleSearch = () => {
    setPage(1)
    fetchUsers(searchText, 1)
  }

  const handleReset = () => {
    setSearchText('')
    setPage(1)
    fetchUsers('', 1)
  }

  const columns: ColumnsType<User> = [
    {
      title: '用户',
      key: 'user',
      width: 160,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{r.name || r.visitor_id?.slice(0, 8) + '...' || '匿名'}</span>
          {r.company && <span style={{ color: '#888', fontSize: 12 }}>{r.company}</span>}
        </Space>
      ),
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 180,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          {r.phone && <span>{r.phone}</span>}
          {r.email && <span style={{ color: '#888', fontSize: 12 }}>{r.email}</span>}
          {!r.phone && !r.email && <span style={{ color: '#ccc' }}>未留联系方式</span>}
        </Space>
      ),
    },
    {
      title: '产品类型',
      dataIndex: 'product_type',
      key: 'product_type',
      width: 100,
      render: (v: string | null) => v || '-',
    },
    {
      title: '目标市场',
      dataIndex: 'target_market',
      key: 'target_market',
      width: 100,
      render: (v: string | null) => v ? <Tag color="blue">{v}</Tag> : '-',
    },
    {
      title: '访问',
      dataIndex: 'visit_count',
      key: 'visit_count',
      width: 70,
      sorter: (a, b) => (a.visit_count || 0) - (b.visit_count || 0),
      render: (v: number) => v || 0,
    },
    {
      title: '询盘',
      dataIndex: 'inquiry_count',
      key: 'inquiry_count',
      width: 70,
      sorter: (a, b) => (a.inquiry_count || 0) - (b.inquiry_count || 0),
      render: (v: number) => v > 0 ? <Tag color="orange">{v}</Tag> : 0,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (v: string | null) => v || '直接访问',
    },
    {
      title: '意向度',
      key: 'intent',
      width: 90,
      render: (_, r) => {
        const { color, text } = intentLevel(r)
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: '最近访问',
      dataIndex: 'last_visit_at',
      key: 'last_visit_at',
      width: 120,
      render: (v: string | null) => v ? dayjs(v).fromNow() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => { setSelectedUser(record); setModalVisible(true) }}
        >
          详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="搜索姓名、公司或邮箱"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 220 }}
            />
            <Button type="primary" onClick={handleSearch}>搜索</Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
            <Button type="primary" onClick={() => message.info('导出功能开发中')} icon={<ExportOutlined />}>导出</Button>
            <span style={{ color: '#888' }}>共 {total} 位用户</span>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description="暂无用户数据，等待访客访问网站后自动记录" /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p) => { setPage(p); fetchUsers(searchText, p) },
          }}
        />
      </Card>

      <Modal
        title={`用户详情 - ${selectedUser?.name || selectedUser?.visitor_id?.slice(0, 8)}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[<Button key="close" onClick={() => setModalVisible(false)}>关闭</Button>]}
        width={720}
      >
        {selectedUser && (
          <Tabs
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="姓名">{selectedUser.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="电话">{selectedUser.phone || '-'}</Descriptions.Item>
                    <Descriptions.Item label="邮箱">{selectedUser.email || '-'}</Descriptions.Item>
                    <Descriptions.Item label="公司">{selectedUser.company || '-'}</Descriptions.Item>
                    <Descriptions.Item label="产品类型">{selectedUser.product_type || '-'}</Descriptions.Item>
                    <Descriptions.Item label="目标市场">{selectedUser.target_market || '-'}</Descriptions.Item>
                    <Descriptions.Item label="访问次数">{selectedUser.visit_count || 0}</Descriptions.Item>
                    <Descriptions.Item label="询盘次数">{selectedUser.inquiry_count || 0}</Descriptions.Item>
                    <Descriptions.Item label="来源渠道">{selectedUser.source || '直接访问'}</Descriptions.Item>
                    <Descriptions.Item label="首次访问">{selectedUser.first_visit_at ? dayjs(selectedUser.first_visit_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="最近访问">{selectedUser.last_visit_at ? dayjs(selectedUser.last_visit_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="首次询盘">{selectedUser.first_inquiry_at ? dayjs(selectedUser.first_inquiry_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="意向度">
                      {(() => { const { color, text } = intentLevel(selectedUser); return <Tag color={color}>{text}</Tag> })()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Visitor ID">
                      <span style={{ fontSize: 11, color: '#999' }}>{selectedUser.visitor_id}</span>
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  )
}
