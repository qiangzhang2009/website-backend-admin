/**
 * Prismatic Analytics - 转化漏斗页
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Card, Row, Col, Select, Spin, Empty, Progress, Table, Tag } from 'antd'
import { useTheme } from '@/components/AdminLayout'

function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || 'prismatic'
}

interface FunnelStep { name: string; count: number; rate: number }

function FunnelPageWithSuspense() {
  const TENANT = useTenantFromURL()
  const { isDark, chartColors, textPrimary, textSecondary, cardBg } = useTheme()
  const [loading, setLoading] = useState(true)
  const [funnel, setFunnel] = useState<FunnelStep[]>([])
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/prismatic/funnel?tenant=${TENANT}&days=${days}`)
      .then(r => r.json())
      .then(d => setFunnel(d.steps || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }, [TENANT, days])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" tip="加载漏斗数据..." /></div>
  }

  const total = funnel[0]?.count || 1

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary, fontSize: 24, fontWeight: 600 }}>
          转化漏斗
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

      {funnel.length === 0 ? (
        <Empty description="暂无漏斗数据" />
      ) : (
        <>
          {/* 漏斗可视化 */}
          <Card title={<span style={{ color: textPrimary }}>漏斗转化率</span>} style={{ background: cardBg, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {funnel.map((step, i) => {
                const widthPct = step.count > 0 ? Math.max(20, (step.count / total) * 100) : 0
                const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a']
                const color = colors[i % colors.length]
                return (
                  <div key={step.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: textSecondary, fontSize: 14 }}>{step.name}</span>
                      <span style={{ color: textPrimary, fontWeight: 600 }}>
                        {step.count} 人
                        <span style={{ color, marginLeft: 8, fontSize: 12 }}>
                          {step.rate}%
                        </span>
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: 36,
                      background: isDark ? '#374151' : '#f3f4f6',
                      borderRadius: 8,
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                      <div style={{
                        width: `${widthPct}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                        borderRadius: 8,
                        transition: 'width 0.5s ease',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: 12,
                      }}>
                        {widthPct > 15 && (
                          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                            {Math.round(widthPct)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 漏斗数据表 */}
          <Card title={<span style={{ color: textPrimary }}>各步骤转化详情</span>} style={{ background: cardBg }}>
            <Table
              dataSource={funnel}
              rowKey="name"
              pagination={false}
              columns={[
                { title: '阶段', dataIndex: 'name', key: 'name', render: (v: string) => <Tag color="blue">{v}</Tag> },
                {
                  title: '人数',
                  dataIndex: 'count',
                  key: 'count',
                  render: (v: number) => <span style={{ fontWeight: 600, color: textPrimary }}>{v}</span>,
                },
                {
                  title: '整体转化率',
                  key: 'rate',
                  render: (_: unknown, r: FunnelStep, i: number) => {
                    if (i === 0) return <Tag color="blue">100%</Tag>
                    return <span style={{ color: chartColors[0] }}>{r.rate}%</span>
                  },
                },
                {
                  title: '本步流失',
                  key: 'loss',
                  render: (_: unknown, r: FunnelStep, i: number) => {
                    if (i === 0) return '-'
                    const prev = funnel[i - 1].count
                    if (prev <= 0) return '-'
                    const loss = (((prev - r.count) / prev) * 100).toFixed(1)
                    return <Tag color="red">-{loss}%</Tag>
                  },
                },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  )
}

export default function FunnelPage() {
  return (
    <Suspense fallback={<div style={{ padding: 50, textAlign: 'center' }}><Spin tip="加载中..." /></div>}>
      <FunnelPageWithSuspense />
    </Suspense>
  )
}
