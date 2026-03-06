/**
 * 工具数据页面 - 真实数据版
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Tag, Space, Select, Spin, Progress, Empty } from 'antd'
import { Column } from '@ant-design/charts'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// 从 URL 参数获取当前租户
function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || ''
}

interface ToolStat {
  tool: string
  total: number
  completed: number
  abandoned: number
  avgTime: string
  completionRate: number
}

interface RecentInteraction {
  tool_name: string
  action: string
  visitor_id: string
  created_at: string
}

export default function ToolsPage() {
  const TENANT = useTenantFromURL()
  const [toolStats, setToolStats] = useState<ToolStat[]>([])
  const [recentInteractions, setRecentInteractions] = useState<RecentInteraction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!TENANT) return
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/tools?tenant=${TENANT}`)
        const data = await res.json()
        setToolStats(data.toolStats ?? [])
        setRecentInteractions(data.recentInteractions ?? [])
      } catch (e) {
        console.error('Tools load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [TENANT])

  const columnConfig = {
    data: toolStats,
    xField: 'tool',
    yField: 'total',
    height: 300,
    label: { position: 'top' as const },
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" /></div>
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>工具数据</h2>
        <Space>
          <Select defaultValue="all" style={{ width: 110 }}
            options={[{ value: 'all', label: '全部工具' }]}
          />
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="各工具使用次数">
            {toolStats.length > 0
              ? <Column {...columnConfig} />
              : <Empty description="暂无工具使用数据，等待用户与工具互动后自动记录" />}
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="工具使用详情">
            {toolStats.length > 0 ? (
              <Table
                dataSource={toolStats}
                rowKey="tool"
                pagination={false}
                columns={[
                  {
                    title: '工具名称',
                    dataIndex: 'tool',
                    key: 'tool',
                    render: (t: string) => <Tag color="blue">{t}</Tag>,
                  },
                  { title: '总使用次数', dataIndex: 'total', key: 'total', sorter: (a: ToolStat, b: ToolStat) => a.total - b.total },
                  {
                    title: '完成次数',
                    dataIndex: 'completed',
                    key: 'completed',
                    render: (v: number) => <span style={{ color: '#52c41a' }}>{v}</span>,
                  },
                  {
                    title: '放弃次数',
                    dataIndex: 'abandoned',
                    key: 'abandoned',
                    render: (v: number) => <span style={{ color: '#ff4d4f' }}>{v}</span>,
                  },
                  { title: '平均用时', dataIndex: 'avgTime', key: 'avgTime' },
                  {
                    title: '完成率',
                    dataIndex: 'completionRate',
                    key: 'completionRate',
                    render: (rate: number) => (
                      <Progress
                        percent={rate}
                        size="small"
                        status={rate > 70 ? 'success' : rate > 40 ? 'normal' : 'exception'}
                        style={{ width: 140 }}
                      />
                    ),
                  },
                ]}
              />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="最新工具使用记录（最近20条）">
            {recentInteractions.length > 0 ? (
              <Table
                dataSource={recentInteractions}
                rowKey={(r, i) => `${r.tool_name}-${i}`}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: '工具',
                    dataIndex: 'tool_name',
                    key: 'tool_name',
                    render: (v: string) => <Tag color="blue">{v}</Tag>,
                  },
                  {
                    title: '动作',
                    dataIndex: 'action',
                    key: 'action',
                    render: (v: string) => {
                      const colorMap: Record<string, string> = { complete: 'green', submit: 'green', start: 'blue', abandon: 'red', input: 'orange' }
                      return <Tag color={colorMap[v] || 'default'}>{v}</Tag>
                    },
                  },
                  {
                    title: '访客ID',
                    dataIndex: 'visitor_id',
                    key: 'visitor_id',
                    render: (v: string) => <span style={{ fontSize: 12, color: '#999' }}>{v?.slice(0, 10)}...</span>,
                  },
                  {
                    title: '时间',
                    dataIndex: 'created_at',
                    key: 'created_at',
                    render: (v: string) => dayjs(v).fromNow(),
                  },
                ]}
              />
            ) : (
              <Empty description="暂无记录" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
