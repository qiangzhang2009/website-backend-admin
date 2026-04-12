/**
 * Prismatic Analytics - 内容健康度页
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Card, Row, Col, Select, Spin, Empty, Table, Tag, Progress } from 'antd'
import { useTheme } from '@/components/AdminLayout'

function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || 'prismatic'
}

interface ContentRow {
  url_path: string
  pv: number
  uv: number
  bounceRate: number
  avgScrollDepth: number
}

function ContentPageWithSuspense() {
  const TENANT = useTenantFromURL()
  const { isDark, chartColors, textPrimary, textSecondary, cardBg } = useTheme()
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState<ContentRow[]>([])
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/prismatic/content?tenant=${TENANT}&days=${days}`)
      .then(r => r.json())
      .then(d => setPages(d.pages || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }, [TENANT, days])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" tip="加载内容数据..." /></div>
  }

  const columns = [
    {
      title: '页面路径',
      dataIndex: 'url_path',
      key: 'url_path',
      ellipsis: true,
      render: (v: string) => (
        <span style={{ color: textPrimary, fontFamily: 'monospace', fontSize: 12 }}>
          {v || '/'}
        </span>
      ),
    },
    {
      title: 'PV',
      dataIndex: 'pv',
      key: 'pv',
      render: (v: number) => <span style={{ color: chartColors[0], fontWeight: 600 }}>{v}</span>,
      sorter: (a: ContentRow, b: ContentRow) => a.pv - b.pv,
    },
    {
      title: 'UV',
      dataIndex: 'uv',
      key: 'uv',
      render: (v: number) => <span style={{ color: chartColors[4], fontWeight: 600 }}>{v}</span>,
      sorter: (a: ContentRow, b: ContentRow) => a.uv - b.uv,
    },
    {
      title: 'PV/UV',
      key: 'ratio',
      render: (_: unknown, r: ContentRow) => {
        const ratio = r.uv > 0 ? (r.pv / r.uv).toFixed(1) : '0'
        return <span style={{ color: textSecondary }}>{ratio}</span>
      },
    },
    {
      title: '跳出率',
      dataIndex: 'bounceRate',
      key: 'bounceRate',
      render: (v: number) => {
        const color = v >= 70 ? 'red' : v >= 40 ? 'orange' : 'green'
        return <Tag color={color}>{v}%</Tag>
      },
    },
    {
      title: '健康度',
      key: 'health',
      render: (_: unknown, r: ContentRow) => {
        const healthScore = r.pv > 0 ? Math.max(0, Math.min(100, 100 - r.bounceRate + (r.uv > 10 ? 10 : 0))) : 0
        return (
          <Progress
            percent={Math.round(healthScore)}
            size="small"
            strokeColor={healthScore >= 60 ? chartColors[1] : healthScore >= 30 ? chartColors[2] : chartColors[3]}
            showInfo={false}
          />
        )
      },
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>
          内容健康度
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
              <div style={{ opacity: 0.85, fontSize: 12 }}>监测页面</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{pages.length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable bodyStyle={{ padding: '16px', textAlign: 'center', background: 'linear-gradient(135deg, #4facfe, #00f2fe)', border: 'none' }}>
            <div style={{ color: '#fff' }}>
              <div style={{ opacity: 0.85, fontSize: 12 }}>总浏览量</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{pages.reduce((s, p) => s + p.pv, 0)}</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable bodyStyle={{ padding: '16px', textAlign: 'center', background: 'linear-gradient(135deg, #43e97b, #38f9d7)', border: 'none' }}>
            <div style={{ color: '#333' }}>
              <div style={{ opacity: 0.75, fontSize: 12 }}>总独立访客</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{pages.reduce((s, p) => s + p.uv, 0)}</div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable bodyStyle={{ padding: '16px', textAlign: 'center', background: 'linear-gradient(135deg, #fa709a, #fee140)', border: 'none' }}>
            <div style={{ color: '#333' }}>
              <div style={{ opacity: 0.75, fontSize: 12 }}>平均跳出率</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {pages.length > 0
                  ? Math.round(pages.reduce((s, p) => s + p.bounceRate, 0) / pages.length)
                  : 0}%
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title={<span style={{ color: textPrimary }}>页面健康度明细</span>} style={{ background: cardBg }}>
        {pages.length > 0 ? (
          <Table
            dataSource={pages}
            rowKey="url_path"
            columns={columns}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            size="middle"
          />
        ) : (
          <Empty description="暂无内容数据，请确保已集成追踪脚本" />
        )}
      </Card>
    </div>
  )
}

export default function ContentPage() {
  return (
    <Suspense fallback={<div style={{ padding: 50, textAlign: 'center' }}><Spin tip="加载中..." /></div>}>
      <ContentPageWithSuspense />
    </Suspense>
  )
}
