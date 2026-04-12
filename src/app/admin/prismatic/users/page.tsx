/**
 * Prismatic Analytics - 访客画像页
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Card, Row, Col, Select, Spin, Empty, Table, Tag, Progress, Avatar } from 'antd'
import { Pie } from '@ant-design/charts'
import { useTheme } from '@/components/AdminLayout'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || 'prismatic'
}

interface VisitorProfile {
  visitor_id: string
  visit_count: number
  total_duration_seconds: number
  first_visit: string
  last_visit: string
  device_type: string
  country: string
}

interface DeviceStats {
  device_type: string
  count: number
  percentage: number
}

function UsersPageWithSuspense() {
  const TENANT = useTenantFromURL()
  const { isDark, chartColors, textPrimary, textSecondary, textMuted, cardBg } = useTheme()
  const [loading, setLoading] = useState(true)
  const [visitors, setVisitors] = useState<VisitorProfile[]>([])
  const [devices, setDevices] = useState<DeviceStats[]>([])
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/prismatic/users?tenant=${TENANT}&days=${days}`)
      .then(r => r.json())
      .then(d => {
        setVisitors(d.visitors || [])
        setDevices(d.devices || [])
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }, [TENANT, days])

  const pieConfig = {
    data: devices,
    angleField: 'count',
    colorField: 'device_type',
    radius: 0.8,
    height: 240,
    label: {
      type: 'outer',
      content: '{percentage}',
      style: { fill: textSecondary },
    },
    legend: { itemName: { style: { fill: textSecondary } } },
    theme: isDark ? 'classicDark' : 'classic',
    color: [chartColors[0], chartColors[4], chartColors[1]],
  }

  const columns = [
    {
      title: '访客 ID',
      dataIndex: 'visitor_id',
      key: 'visitor_id',
      ellipsis: true,
      render: (v: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar style={{ background: chartColors[0], fontSize: 12 }} size="small">
            {v?.charAt(2)?.toUpperCase() || 'V'}
          </Avatar>
          <span style={{ color: textMuted, fontFamily: 'monospace', fontSize: 11 }}>{v}</span>
        </div>
      ),
    },
    {
      title: '访问次数',
      dataIndex: 'visit_count',
      key: 'visit_count',
      sorter: (a: VisitorProfile, b: VisitorProfile) => a.visit_count - b.visit_count,
      render: (v: number) => (
        <span style={{ color: chartColors[0], fontWeight: 600 }}>{v}</span>
      ),
    },
    {
      title: '累计时长',
      dataIndex: 'total_duration_seconds',
      key: 'total_duration_seconds',
      sorter: (a: VisitorProfile, b: VisitorProfile) => a.total_duration_seconds - b.total_duration_seconds,
      render: (v: number) => {
        const mins = Math.round(v / 60)
        return <span style={{ color: textSecondary }}>{mins > 60 ? `${Math.round(mins / 60)}h ${mins % 60}m` : `${mins}m`}</span>
      },
    },
    {
      title: '设备',
      dataIndex: 'device_type',
      key: 'device_type',
      render: (v: string) => {
        const colors: Record<string, string> = { desktop: 'blue', mobile: 'green', tablet: 'orange' }
        return <Tag color={colors[v] || 'default'}>{v}</Tag>
      },
    },
    {
      title: '国家/地区',
      dataIndex: 'country',
      key: 'country',
      render: (v: string) => <span style={{ color: textSecondary }}>{v || '未知'}</span>,
    },
    {
      title: '首次访问',
      dataIndex: 'first_visit',
      key: 'first_visit',
      render: (v: string) => (
        <span style={{ color: textMuted, fontSize: 12 }}>
          {v ? dayjs(v).fromNow() : '-'}
        </span>
      ),
    },
    {
      title: '最近访问',
      dataIndex: 'last_visit',
      key: 'last_visit',
      render: (v: string) => (
        <span style={{ color: textMuted, fontSize: 12 }}>
          {v ? dayjs(v).fromNow() : '-'}
        </span>
      ),
    },
    {
      title: '活跃度',
      key: 'activity',
      render: (_: unknown, r: VisitorProfile) => {
        const score = Math.min(100, r.visit_count * 20 + Math.round(r.total_duration_seconds / 60))
        return (
          <Progress
            percent={score}
            size="small"
            strokeColor={score >= 60 ? chartColors[1] : score >= 30 ? chartColors[2] : chartColors[3]}
            showInfo={false}
          />
        )
      },
    },
  ]

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" tip="加载访客数据..." /></div>
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>
          访客画像
          <Tag color="purple" style={{ marginLeft: 12 }}>Prismatic</Tag>
        </h2>
        <Select
          value={days}
          onChange={setDays}
          style={{ width: 140 }}
          options={[
            { value: 7, label: '最近 7 天' },
            { value: 30, label: '最近 30 天' },
            { value: 90, label: '最近 90 天' },
          ]}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card hoverable bodyStyle={{ padding: '16px', textAlign: 'center', background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}>
            <div style={{ color: '#fff' }}>
              <div style={{ opacity: 0.85, fontSize: 12 }}>访客总数</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{visitors.length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable bodyStyle={{ padding: '16px', textAlign: 'center', background: 'linear-gradient(135deg, #4facfe, #00f2fe)', border: 'none' }}>
            <div style={{ color: '#fff' }}>
              <div style={{ opacity: 0.85, fontSize: 12 }}>回访访客</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{visitors.filter(v => v.visit_count > 1).length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable bodyStyle={{ padding: '16px', textAlign: 'center', background: 'linear-gradient(135deg, #43e97b, #38f9d7)', border: 'none' }}>
            <div style={{ color: '#333' }}>
              <div style={{ opacity: 0.75, fontSize: 12 }}>平均访问时长</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {visitors.length > 0
                  ? Math.round(visitors.reduce((s, v) => s + v.total_duration_seconds, 0) / visitors.length / 60)
                  : 0}m
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable bodyStyle={{ padding: '16px', textAlign: 'center', background: 'linear-gradient(135deg, #fa709a, #fee140)', border: 'none' }}>
            <div style={{ color: '#333' }}>
              <div style={{ opacity: 0.75, fontSize: 12 }}>高频访客(&gt;5次)</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{visitors.filter(v => v.visit_count > 5).length}</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title={<span style={{ color: textPrimary }}>设备分布</span>} style={{ background: cardBg }}>
            {devices.length > 0 ? <Pie {...pieConfig} /> : <Empty description="暂无设备数据" />}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title={<span style={{ color: textPrimary }}>访客明细</span>} style={{ background: cardBg }}>
            {visitors.length > 0 ? (
              <Table
                dataSource={visitors}
                rowKey="visitor_id"
                columns={columns}
                pagination={{ pageSize: 15, showSizeChanger: true }}
                size="small"
                scroll={{ x: 800 }}
              />
            ) : (
              <Empty description="暂无访客数据，请确保已集成追踪脚本" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div style={{ padding: 50, textAlign: 'center' }}><Spin tip="加载中..." /></div>}>
      <UsersPageWithSuspense />
    </Suspense>
  )
}
