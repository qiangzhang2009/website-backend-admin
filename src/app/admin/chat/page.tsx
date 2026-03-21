/**
 * 聊天记录管理
 * 多彩渐变设计风格
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Table, Tag, Button, Space, Input, Select, Row, Col, Descriptions, Drawer, Spin, Tooltip, Alert } from 'antd'
import { SearchOutlined, EyeOutlined, ReloadOutlined, GlobalOutlined, MobileOutlined, DesktopOutlined } from '@ant-design/icons'
import { useSearchParams } from 'next/navigation'
import dayjs from 'dayjs'
import { useTheme } from '@/components/AdminLayout'
import { formatInputParams } from '@/lib/params-normalize'

const { Option } = Select

function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || 'zxqconsulting'
}

interface ChatRecord {
  id: string
  visitor_id: string
  visitor_label: string
  device: string
  browser: string
  location: string
  tool_name: string
  action: string
  message: string | null
  input_params: Record<string, any> | null
  output_result: Record<string, any> | null
  created_at: string
}

export default function ChatHistoryPage() {
  const TENANT = useTenantFromURL()
  const { textSecondary, textMuted, textPrimary, isDark } = useTheme()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ChatRecord[]>([])
  const [total, setTotal] = useState(0)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const [toolFilter, setToolFilter] = useState<string | undefined>()
  const [searchText, setSearchText] = useState('')
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<ChatRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  const STAT_CARDS = [
    { key: 'total', label: '总消息', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', icon: '💬' },
    { key: 'chat', label: 'AI对话', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', icon: '🤖' },
    { key: 'tools', label: '工具交互', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: '🛠️' },
    { key: 'today', label: '今日消息', gradient: 'linear-gradient(135deg, #10b981, #059669)', icon: '📅' },
  ]

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        tenant: TENANT,
        page: String(page),
        limit: String(pagination.pageSize),
      })
      if (toolFilter) params.set('tool', toolFilter)
      if (searchText) params.set('search', searchText)
      
      const res = await fetch(`/api/admin/chat?${params}`)
      const result = await res.json()
      
      if (result.error) {
        setError(result.error)
      }
      
      setData(result.data || [])
      setTotal(result.total || 0)
    } catch (e) {
      console.error('Chat data fetch error:', e)
      setError(String(e))
      setData([])
    } finally {
      setLoading(false)
    }
  }, [TENANT, pagination.pageSize, toolFilter, searchText])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    fetchData(pagination.current)
  }

  const handleViewDetail = (record: ChatRecord) => {
    setSelectedRecord(record)
    setDrawerVisible(true)
  }

  const getDeviceIcon = (device: string) => {
    if (device?.toLowerCase().includes('mobile') || device?.toLowerCase().includes('phone')) {
      return <MobileOutlined />
    }
    return <DesktopOutlined />
  }

  const columns = [
    {
      title: '访客',
      key: 'visitor',
      width: 180,
      render: (_: unknown, r: ChatRecord) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Tooltip title={r.visitor_id}>
            <span style={{ 
              color: '#8b5cf6', 
              fontWeight: 500,
              fontSize: 13
            }}>
              {r.visitor_label || r.visitor_id?.substring(0, 10) || '访客'}
            </span>
          </Tooltip>
          <Space size={4}>
            {r.location && r.location !== '-' && (
              <Tag icon={<GlobalOutlined />} color="default" style={{ fontSize: 10, padding: '0 4px' }}>
                {r.location}
              </Tag>
            )}
            {r.device && (
              <Tooltip title={r.browser ? `${r.device} · ${r.browser}` : r.device}>
                <span style={{ color: textMuted, fontSize: 11 }}>
                  {getDeviceIcon(r.device)}
                </span>
              </Tooltip>
            )}
          </Space>
        </div>
      ),
    },
    {
      title: '工具',
      dataIndex: 'tool_name',
      key: 'tool_name',
      width: 120,
      render: (v: string) => <Tag color="purple">{v}</Tag>,
    },
    {
      title: '行为',
      dataIndex: 'action',
      key: 'action',
      width: 80,
      render: (v: string) => {
        const map: Record<string, { color: string; text: string }> = {
          start: { color: 'blue', text: '开始' },
          input: { color: 'orange', text: '输入' },
          submit: { color: 'green', text: '提交' },
          complete: { color: 'green', text: '完成' },
          save: { color: 'cyan', text: '保存' },
          abandon: { color: 'red', text: '放弃' },
        }
        const cfg = map[v] || { color: 'default', text: v }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '消息内容',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (v: string | null) => <span style={{ color: textSecondary }}>{v || '-'}</span>,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100,
      render: (v: string) => <span style={{ color: textMuted, fontSize: 12 }}>{dayjs(v).format('MM-DD HH:mm')}</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, r: ChatRecord) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(r)}>详情</Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>聊天记录</h2>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>刷新</Button>
      </div>

      {error && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {STAT_CARDS.map(card => (
          <Col xs={12} sm={6} key={card.key}>
            <Card hoverable style={{ background: card.gradient, border: 'none' }} bodyStyle={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ color: '#fff' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{card.icon}</div>
                <div style={{ opacity: 0.9, fontSize: 12 }}>{card.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {card.key === 'today' 
                    ? data.filter(d => dayjs(d.created_at).isSame(dayjs(), 'day')).length 
                    : card.key === 'chat' 
                      ? data.filter(d => d.tool_name?.includes('chat')).length
                      : card.key === 'tools'
                        ? data.filter(d => !d.tool_name?.includes('chat')).length
                        : total}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input placeholder="搜索消息内容" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 220 }} />
            <Select placeholder="选择工具" allowClear value={toolFilter} onChange={setToolFilter} style={{ width: 150 }}>
              <Option value="ai_chat">AI对话</Option>
              <Option value="market_analyzer">市场分析</Option>
              <Option value="naming">起名</Option>
              <Option value="tarot">塔罗牌</Option>
              <Option value="fengshui">风水</Option>
            </Select>
            <Button type="primary" onClick={() => fetchData(1)}>搜索</Button>
          </Space>
        </div>
        <Table 
          columns={columns} 
          dataSource={data} 
          loading={loading}
          rowKey="id" 
          locale={{ 
            emptyText: (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ color: textMuted, marginBottom: 8 }}>暂无聊天记录数据</p>
                <p style={{ color: textMuted, fontSize: 12 }}>
                  当您的网站集成了追踪代码后，用户使用 AI 工具的交互记录将自动显示在这里
                </p>
              </div>
            ) 
          }}
          pagination={{ 
            current: pagination.current, 
            pageSize: pagination.pageSize, 
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p) => { setPagination({ ...pagination, current: p }); fetchData(p) } 
          }} 
        />
      </Card>

      {/* 详情抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>聊天记录详情</span>
            {selectedRecord && (
              <Tag color={selectedRecord.action === 'complete' ? 'green' : selectedRecord.action === 'abandon' ? 'red' : 'blue'}>
                {selectedRecord.action === 'complete' ? '已完成' : selectedRecord.action === 'abandon' ? '已放弃' : '进行中'}
              </Tag>
            )}
          </div>
        }
        placement="right"
        width={600}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedRecord ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card size="small" title={<span style={{ color: textPrimary }}>访客信息</span>}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px 12px', fontSize: 14 }}>
                <span style={{ color: textMuted }}>访客ID</span>
                <code style={{ color: '#8b5cf6', fontSize: 12 }}>{selectedRecord.visitor_id}</code>
                
                <span style={{ color: textMuted }}>来源</span>
                <Tag icon={<GlobalOutlined />} color="default">
                  {selectedRecord.location || '未知'}
                </Tag>
                
                <span style={{ color: textMuted }}>设备</span>
                <span style={{ color: textSecondary }}>
                  {selectedRecord.device || '-'} {selectedRecord.browser ? `· ${selectedRecord.browser}` : ''}
                </span>
              </div>
            </Card>

            <Card size="small" title={<span style={{ color: textPrimary }}>会话信息</span>}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px 12px', fontSize: 14 }}>
                <span style={{ color: textMuted }}>工具</span>
                <Tag color="purple">{selectedRecord.tool_name}</Tag>
                
                <span style={{ color: textMuted }}>行为</span>
                <Tag color={selectedRecord.action === 'complete' ? 'green' : selectedRecord.action === 'abandon' ? 'red' : 'blue'}>
                  {selectedRecord.action}
                </Tag>
                
                <span style={{ color: textMuted }}>时间</span>
                <span style={{ color: textSecondary }}>{dayjs(selectedRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}</span>
              </div>
            </Card>

            {selectedRecord.message && (
              <Card size="small" title={<span style={{ color: textPrimary }}>消息内容</span>}>
                <div style={{ 
                  padding: 16, 
                  background: isDark ? '#1f2937' : '#f9fafb', 
                  borderRadius: 8,
                  color: textPrimary,
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                  fontSize: 14
                }}>
                  {selectedRecord.message}
                </div>
              </Card>
            )}

            {selectedRecord.input_params && (
              <Card size="small" title={<span style={{ color: textPrimary }}>输入参数</span>}>
                <pre style={{ 
                  margin: 0, 
                  padding: 16, 
                  background: isDark ? '#1f2937' : '#f3f4f6', 
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 13,
                  overflow: 'auto',
                  maxHeight: 300
                }}>
                  {formatInputParams(selectedRecord.input_params)}
                </pre>
              </Card>
            )}

            {selectedRecord.output_result ? (
              <Card size="small" title={<span style={{ color: textPrimary }}>输出结果</span>}>
                <pre style={{ 
                  margin: 0, 
                  padding: 16, 
                  background: isDark ? '#064e3b' : '#ecfdf5', 
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 13,
                  overflow: 'auto',
                  maxHeight: 500,
                  border: '1px solid #10b981'
                }}>
                  {formatInputParams(selectedRecord.output_result as Record<string, unknown>)}
                </pre>
              </Card>
            ) : (
              <Card size="small" title={<span style={{ color: textPrimary }}>输出结果</span>}>
                <div style={{ 
                  padding: 24, 
                  textAlign: 'center', 
                  color: textMuted,
                  background: isDark ? '#1f2937' : '#f9fafb',
                  borderRadius: 8
                }}>
                  用户中途放弃，无输出结果
                </div>
              </Card>
            )}
          </div>
        ) : (
          <Spin />
        )}
      </Drawer>
    </div>
  )
}
