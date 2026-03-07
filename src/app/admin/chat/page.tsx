/**
 * 聊天记录管理
 * 查看用户的问答历史
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Space, Input, Select, DatePicker, Row, Col, Statistic, message } from 'antd'
import { SearchOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

export default function ChatHistoryPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({
    tenant: 'zero',
    module: '',
    keyword: '',
  })
  const [selectedChat, setSelectedChat] = useState<any>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        tenant: filters.tenant,
        page: pagination.current.toString(),
        pageSize: pagination.pageSize.toString(),
      })
      if (filters.module) params.append('module', filters.module)
      if (filters.keyword) params.append('keyword', filters.keyword)

      const res = await fetch(`/api/admin/chat?${params}`)
      const json = await res.json()
      
      if (json.data) {
        setData(json.data)
        setPagination(prev => ({ ...prev, total: json.total || 0 }))
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error)
      message.error('获取聊天记录失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [pagination.current, filters.tenant])

  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '模块',
      dataIndex: 'divination_type',
      key: 'divination_type',
      width: 100,
      render: (text: string) => <Tag color="blue">{text || '-'}</Tag>,
    },
    {
      title: '用户消息',
      dataIndex: 'user_message',
      key: 'user_message',
      ellipsis: true,
      render: (text: string) => <span style={{ maxWidth: 300, display: 'block' }}>{text || '-'}</span>,
    },
    {
      title: 'AI回复',
      dataIndex: 'ai_message',
      key: 'ai_message',
      ellipsis: true,
      render: (text: string) => <span style={{ maxWidth: 300, display: 'block', color: '#666' }}>{text || '-'}</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => setSelectedChat(record)}
        >
          详情
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>聊天记录</h1>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              value={filters.tenant}
              onChange={(val) => setFilters(prev => ({ ...prev, tenant: val }))}
            >
              <Select.Option value="zxqconsulting">zxqconsulting</Select.Option>
              <Select.Option value="zero">知几 (zero)</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Input
              placeholder="搜索关键词"
              prefix={<SearchOutlined />}
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              onPressEnter={fetchData}
            />
          </Col>
          <Col span={4}>
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>
              刷新
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page) => setPagination(prev => ({ ...prev, current: page })),
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 详情弹窗 */}
      {selectedChat && (
        <Card
          title="聊天详情"
          style={{ marginTop: 16 }}
          extra={
            <Button onClick={() => setSelectedChat(null)}>关闭</Button>
          }
        >
          <Row gutter={16}>
            <Col span={12}>
              <Statistic 
                title="用户消息" 
                value={selectedChat.user_message || '-'} 
                valueStyle={{ fontSize: 16, fontWeight: 'normal' }}
              />
            </Col>
            <Col span={12}>
              <Statistic 
                title="AI回复" 
                value={selectedChat.ai_message || '-'} 
                valueStyle={{ fontSize: 16, fontWeight: 'normal' }}
              />
            </Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <p><strong>模块：</strong>{selectedChat.divination_type}</p>
            <p><strong>时间：</strong>{dayjs(selectedChat.created_at).format('YYYY-MM-DD HH:mm:ss')}</p>
            <p><strong>访客ID：</strong>{selectedChat.visitor_id || '-'}</p>
            <p><strong>会话ID：</strong>{selectedChat.session_id || '-'}</p>
          </div>
        </Card>
      )}
    </div>
  )
}
