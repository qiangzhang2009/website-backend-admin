/**
 * 仪表盘页面 - 真实数据版
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Button, Space, DatePicker, Spin } from 'antd'
import {
  UserOutlined,
  MessageOutlined,
  RiseOutlined,
  EyeOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import { Line, Column, Pie } from '@ant-design/charts'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { RangePicker } = DatePicker

// 从 URL 参数获取当前租户
function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || ''
}

interface Stats {
  todayVisitors: number
  todayVisitorsChange: number
  totalUsers: number
  totalUsersChange: number
  inquiries: number
  inquiriesChange: number
  conversionRate: number
}

interface TrafficRow { date: string; visitors: number; pageViews: number }
interface ToolRow { tool: string; total: number; completed: number; abandoned: number; avgTime: string; completionRate: number }
interface InquiryRow {
  id: string; name: string; company: string; product_type: string
  target_market: string; status: string; created_at: string
}

export default function DashboardPage() {
  const TENANT = useTenantFromURL()
  const [stats, setStats] = useState<Stats | null>(null)
  const [traffic, setTraffic] = useState<TrafficRow[]>([])
  const [tools, setTools] = useState<ToolRow[]>([])
  const [inquiries, setInquiries] = useState<InquiryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 只有租户确定后才加载数据
    if (!TENANT) return

    const load = async () => {
      try {
        const [statsRes, trafficRes, toolsRes, inqRes] = await Promise.all([
          fetch(`/api/admin/stats?tenant=${TENANT}`),
          fetch(`/api/admin/traffic?tenant=${TENANT}&days=7`),
          fetch(`/api/admin/tools?tenant=${TENANT}`),
          fetch(`/api/admin/inquiries?tenant=${TENANT}&limit=5`),
        ])
        const [statsData, trafficData, toolsData, inqData] = await Promise.all([
          statsRes.json(), trafficRes.json(), toolsRes.json(), inqRes.json(),
        ])
        setStats(statsData)
        setTraffic(trafficData)
        setTools(toolsData.toolStats ?? [])
        setInquiries(inqData.data ?? [])
      } catch (e) {
        console.error('Dashboard load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [TENANT])

  const lineConfig = {
    data: traffic.flatMap(d => [
      { date: d.date, value: d.visitors, type: '访客' },
      { date: d.date, value: d.pageViews, type: '页面浏览' },
    ]),
    xField: 'date',
    yField: 'value',
    colorField: 'type',
    smooth: true,
    height: 280,
    xAxis: { label: { formatter: (v: string) => dayjs(v).format('MM-DD') } },
  }

  const columnConfig = {
    data: tools.slice(0, 6),
    xField: 'tool',
    yField: 'total',
    color: '#52c41a',
    height: 250,
    label: { position: 'top' as const },
  }

  const pieConfig = {
    data: tools.map(t => ({ market: t.tool, value: t.total })).filter(t => t.value > 0),
    angleField: 'value',
    colorField: 'market',
    radius: 0.8,
    innerRadius: 0.6,
    height: 250,
    legend: { position: 'right' as const },
    label: false,
  }

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '公司', dataIndex: 'company', key: 'company' },
    { title: '产品类型', dataIndex: 'product_type', key: 'product_type' },
    { title: '目标市场', dataIndex: 'target_market', key: 'target_market' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
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
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t: string) => dayjs(t).fromNow(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: InquiryRow) => (
        <Space>
          <Button type="link" size="small" href={`/admin/inquiries`}>查看</Button>
          <Button type="link" size="small">跟进</Button>
        </Space>
      ),
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载数据中..." />
      </div>
    )
  }

  const s = stats ?? { todayVisitors: 0, todayVisitorsChange: 0, totalUsers: 0, totalUsersChange: 0, inquiries: 0, inquiriesChange: 0, conversionRate: 0 }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>数据概览</h2>
        <Space>
          <RangePicker />
          <Button icon={<ExportOutlined />}>导出数据</Button>
        </Space>
      </div>

      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="今日访客" value={s.todayVisitors} prefix={<EyeOutlined />} suffix="人" styles={{ content: { color: '#1890ff' } }} />
            <div style={{ color: s.todayVisitorsChange >= 0 ? '#52c41a' : '#ff4d4f' }}>
              {s.todayVisitorsChange >= 0 ? '+' : ''}{s.todayVisitorsChange}% 较昨日
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="总用户数" value={s.totalUsers} prefix={<UserOutlined />} suffix="人" styles={{ content: { color: '#52c41a' } }} />
            <div style={{ color: s.totalUsersChange >= 0 ? '#52c41a' : '#ff4d4f' }}>
              {s.totalUsersChange >= 0 ? '+' : ''}{s.totalUsersChange}% 较上周
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="询盘总数" value={s.inquiries} prefix={<MessageOutlined />} suffix="条" styles={{ content: { color: '#faad14' } }} />
            <div style={{ color: s.inquiriesChange >= 0 ? '#52c41a' : '#ff4d4f' }}>
              {s.inquiriesChange >= 0 ? '+' : ''}{s.inquiriesChange}% 较上周
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="转化率" value={s.conversionRate} prefix={<RiseOutlined />} suffix="%" styles={{ content: { color: '#722ed1' } }} />
            <div style={{ color: '#999', fontSize: 12 }}>询盘用户 / 总访客</div>
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="访问趋势">
            {traffic.length > 0 ? <Line {...lineConfig} /> : <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无访问数据，请确认追踪 SDK 已正确嵌入网站</div>}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="工具使用分布">
            {tools.length > 0 ? <Pie {...pieConfig} /> : <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无工具使用数据</div>}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="工具使用排行">
            {tools.length > 0 ? <Column {...columnConfig} /> : <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无数据</div>}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最新询盘" extra={<Button type="link" href="/admin/inquiries">查看全部</Button>}>
            {inquiries.length > 0 ? (
              <Table columns={columns} dataSource={inquiries} rowKey="id" pagination={false} size="small" />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无询盘数据</div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
