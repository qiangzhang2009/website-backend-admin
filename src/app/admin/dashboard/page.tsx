/**
 * 仪表盘页面 - 真实数据版
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Button, Space, DatePicker, Spin, message } from 'antd'
import {
  UserOutlined,
  MessageOutlined,
  RiseOutlined,
  EyeOutlined,
  ExportOutlined,
  AppstoreOutlined,
  FundOutlined,
  BarChartOutlined,
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
interface ModuleStat {
  module: string
  total: number
  completed: number
  abandoned: number
  avgTime: string
  completionRate: number
}
interface RfmSummary {
  VIP: number
  Regular: number
  At_Risk: number
  Lost: number
  total: number
}

export default function DashboardPage() {
  const TENANT = useTenantFromURL()
  const [stats, setStats] = useState<Stats | null>(null)
  const [traffic, setTraffic] = useState<TrafficRow[]>([])
  const [tools, setTools] = useState<ToolRow[]>([])
  const [inquiries, setInquiries] = useState<InquiryRow[]>([])
  const [moduleStats, setModuleStats] = useState<Record<string, ModuleStat>>({})
  const [rfmSummary, setRfmSummary] = useState<RfmSummary>({ VIP: 0, Regular: 0, At_Risk: 0, Lost: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 只有租户确定后才加载数据
    if (!TENANT) return

    const load = async () => {
      try {
        const [statsRes, trafficRes, toolsRes, inqRes, modulesRes, rfmRes] = await Promise.all([
          fetch(`/api/admin/stats?tenant=${TENANT}`),
          fetch(`/api/admin/traffic?tenant=${TENANT}&days=7`),
          fetch(`/api/admin/tools?tenant=${TENANT}`),
          fetch(`/api/admin/inquiries?tenant=${TENANT}&limit=5`),
          fetch(`/api/admin/modules?tenant=${TENANT}`),
          fetch(`/api/admin/rfm?tenant=${TENANT}`),
        ])
        const [statsData, trafficData, toolsData, inqData, modulesData, rfmData] = await Promise.all([
          statsRes.json(), trafficRes.json(), toolsRes.json(), inqRes.json(), modulesRes.json(), rfmRes.json(),
        ])
        setStats(statsData)
        setTraffic(trafficData)
        setTools(toolsData.toolStats ?? [])
        setInquiries(inqData.data ?? [])
        setModuleStats(modulesData.stats ?? {})
        setRfmSummary(rfmData.summary ?? { VIP: 0, Regular: 0, At_Risk: 0, Lost: 0, total: 0 })
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
  const moduleList = Object.values(moduleStats).filter(m => m.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>数据概览</h2>
        <Space>
          <RangePicker />
          <Button icon={<ExportOutlined />} onClick={() => message.info('导出功能开发中')}>导出数据</Button>
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

      {/* RFM 用户价值分析 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title="🎯 用户价值分布 (RFM)" extra={<Button type="link" href={`/admin/rfm?tenant=${TENANT}`}>查看详情</Button>}>
            <Row gutter={16}>
              <Col xs={6}>
                <div className="text-center p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg text-white">
                  <div className="text-3xl font-bold">{rfmSummary.VIP}</div>
                  <div className="text-sm">高价值用户</div>
                </div>
              </Col>
              <Col xs={6}>
                <div className="text-center p-4 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg text-white">
                  <div className="text-3xl font-bold">{rfmSummary.Regular}</div>
                  <div className="text-sm">普通用户</div>
                </div>
              </Col>
              <Col xs={6}>
                <div className="text-center p-4 bg-gradient-to-r from-red-400 to-red-600 rounded-lg text-white">
                  <div className="text-3xl font-bold">{rfmSummary.At_Risk}</div>
                  <div className="text-sm">风险用户</div>
                </div>
              </Col>
              <Col xs={6}>
                <div className="text-center p-4 bg-gradient-to-r from-gray-400 to-gray-600 rounded-lg text-white">
                  <div className="text-3xl font-bold">{rfmSummary.Lost}</div>
                  <div className="text-sm">流失用户</div>
                </div>
              </Col>
            </Row>
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

      {/* 模块使用分析 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="📊 模块使用排行" extra={<Button type="link" href={`/admin/modules?tenant=${TENANT}`}>查看详情</Button>}>
            {moduleList.length > 0 ? (
              <div className="space-y-3">
                {moduleList.slice(0, 5).map((m, idx) => (
                  <div key={m.module} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-medium">{m.module}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-blue-600">{m.total} 次</span>
                      <span className={`${m.completionRate >= 60 ? 'text-green-600' : m.completionRate >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {m.completionRate}% 完成
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无模块使用数据</div>
            )}
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
