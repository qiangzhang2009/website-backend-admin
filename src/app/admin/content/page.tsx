/**
 * 内容热度分析页面
 * 使用 Ant Design 组件，支持深色主题和客户端筛选
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, Row, Col, Table, Tag, Button, Space, Statistic, Input, Progress } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useTheme } from '@/components/AdminLayout'

interface ContentItem {
  contentType: string
  contentId: string
  contentName: string
  viewCount: number
  uniqueViewers: number
  avgDuration: number
  interactionCount: number
  conversionCount: number
  lastViewedAt: string
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  tool: { label: '工具', color: 'purple' },
  page: { label: '页面', color: 'blue' },
  article: { label: '文章', color: 'green' },
  module: { label: '模块', color: 'orange' },
}

export default function ContentPage() {
  const searchParams = useSearchParams()
  const tenant = searchParams.get('tenant') || 'zxqconsulting'
  const { isDark, textPrimary, textSecondary, textMuted, infoColor, successColor, warningColor, cardBg } = useTheme()
  
  const [allData, setAllData] = useState<ContentItem[]>([])
  const [summary, setSummary] = useState<{ totalViews: number; totalUniqueViewers: number; totalInteractions: number; topContent: ContentItem[] }>({
    totalViews: 0,
    totalUniqueViewers: 0,
    totalInteractions: 0,
    topContent: [],
  })
  const [loading, setLoading] = useState(true)
  const [filterText, setFilterText] = useState('')
  const [selectedType, setSelectedType] = useState<string>('')

  // 客户端筛选
  const data = useMemo(() => {
    let result = allData
    
    // 按类型筛选
    if (selectedType) {
      result = result.filter(item => item.contentType === selectedType)
    }
    
    // 按关键词搜索
    if (filterText) {
      const searchLower = filterText.toLowerCase()
      result = result.filter(item => 
        item.contentName?.toLowerCase().includes(searchLower) || 
        item.contentId?.toLowerCase().includes(searchLower)
      )
    }
    
    return result
  }, [allData, selectedType, filterText])

  // 按类型统计
  const typeStats = useMemo(() => {
    const stats: Record<string, number> = { tool: 0, page: 0, article: 0, module: 0 }
    allData.forEach(item => {
      if (stats[item.contentType] !== undefined) {
        stats[item.contentType]++
      }
    })
    return stats
  }, [allData])

  useEffect(() => {
    fetchData()
  }, [tenant])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/content?tenant=${tenant}`)
      const result = await res.json()
      
      if (result.data) {
        setAllData(result.data)
      }
      if (result.summary) {
        setSummary(result.summary)
      }
    } catch (error) {
      console.error('Failed to fetch content data:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: '内容',
      key: 'content',
      render: (_: any, record: ContentItem) => (
        <div>
          <div style={{ fontWeight: 500, color: textPrimary }}>{record.contentName || record.contentId}</div>
          <div style={{ fontSize: 12, color: textMuted }}>{record.contentId}</div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'contentType',
      key: 'contentType',
      render: (type: string) => {
        const config = TYPE_CONFIG[type] || { label: type, color: 'default' }
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '浏览量',
      dataIndex: 'viewCount',
      key: 'viewCount',
      sorter: (a: ContentItem, b: ContentItem) => a.viewCount - b.viewCount,
      render: (v: number) => <span style={{ color: infoColor, fontWeight: 600 }}>{(v || 0).toLocaleString()}</span>,
    },
    {
      title: '独立访客',
      dataIndex: 'uniqueViewers',
      key: 'uniqueViewers',
      render: (v: number) => <span style={{ color: textSecondary }}>{(v || 0).toLocaleString()}</span>,
    },
    {
      title: '平均停留',
      dataIndex: 'avgDuration',
      key: 'avgDuration',
      render: (v: number) => <span style={{ color: textSecondary }}>{formatDuration(v)}</span>,
    },
    {
      title: '互动数',
      dataIndex: 'interactionCount',
      key: 'interactionCount',
      render: (v: number) => (
        <span style={{ color: v > 0 ? successColor : textMuted }}>
          {(v || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: '最后浏览',
      dataIndex: 'lastViewedAt',
      key: 'lastViewedAt',
      render: (v: string) => <span style={{ color: textMuted }}>{v ? new Date(v).toLocaleDateString() : '-'}</span>,
    },
    {
      title: '热度',
      dataIndex: 'viewCount',
      key: 'heat',
      render: (v: number) => {
        const maxView = Math.max(...allData.map(item => item.viewCount || 0), 1)
        const percent = maxView > 0 ? ((v || 0) / maxView) * 100 : 0
        let color = infoColor
        if (percent >= 80) color = '#ef4444'
        else if (percent >= 60) color = '#f97316'
        else if (percent >= 40) color = '#eab308'
        
        return (
          <div style={{ width: 80 }}>
            <Progress percent={percent} showInfo={false} strokeColor={color} trailColor={isDark ? '#374151' : '#e5e7eb'} size="small" />
          </div>
        )
      },
    },
  ]

  const typeButtons = [
    { key: '', label: '全部', count: allData.length },
    { key: 'tool', label: '工具', count: typeStats.tool },
    { key: 'page', label: '页面', count: typeStats.page },
    { key: 'module', label: '模块', count: typeStats.module },
    { key: 'article', label: '文章', count: typeStats.article },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: textPrimary }}>内容热度分析</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新数据</Button>
      </div>

      {/* 统计概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic 
              title={<span style={{ color: textSecondary }}>总浏览量</span>} 
              value={summary.totalViews || 0} 
              valueStyle={{ color: infoColor }} 
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic 
              title={<span style={{ color: textSecondary }}>独立访客</span>} 
              value={summary.totalUniqueViewers || 0} 
              valueStyle={{ color: successColor }} 
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic 
              title={<span style={{ color: textSecondary }}>互动次数</span>} 
              value={summary.totalInteractions || 0} 
              valueStyle={{ color: warningColor }} 
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic 
              title={<span style={{ color: textSecondary }}>内容条目</span>} 
              value={allData.length} 
              valueStyle={{ color: textPrimary }} 
            />
          </Card>
        </Col>
      </Row>

      {/* 类型筛选 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          {typeButtons.map(btn => (
            <Button
              key={btn.key}
              type={selectedType === btn.key ? 'primary' : 'default'}
              onClick={() => setSelectedType(btn.key)}
            >
              {btn.label} ({btn.count})
            </Button>
          ))}
        </Space>
      </Card>

      {/* 搜索 */}
      <Card style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索内容名称或ID..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{ maxWidth: 300 }}
          allowClear
        />
      </Card>

      {/* 内容列表 */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: textMuted }}>
            {filterText || selectedType ? '筛选结果为空' : '暂无数据'}
          </div>
        ) : (
          <Table
            dataSource={data.sort((a, b) => b.viewCount - a.viewCount)}
            rowKey={(record) => `${record.contentType}-${record.contentId}`}
            pagination={{ 
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total: number) => `共 ${total} 条内容`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            columns={columns}
            size="small"
          />
        )}
      </Card>

      {/* 热门内容 */}
      {summary.topContent && summary.topContent.length > 0 && (
        <Card style={{ marginTop: 24 }} title={<span style={{ color: textPrimary }}>🔥 热门内容 TOP 5</span>}>
          {summary.topContent.map((item, idx) => (
            <div 
              key={item.contentId} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12, 
                padding: '12px 0',
                borderBottom: idx < summary.topContent.length - 1 ? `1px solid ${isDark ? '#374151' : '#f3f4f6'}` : 'none'
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: idx === 0 ? '#f59e0b' : idx === 1 ? '#9ca3af' : idx === 2 ? '#f97316' : infoColor,
                color: '#fff', fontWeight: 'bold', fontSize: 12
              }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: textPrimary }}>{item.contentName || item.contentId}</div>
                <div style={{ fontSize: 12, color: textMuted }}>{TYPE_CONFIG[item.contentType]?.label || item.contentType}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: infoColor }}>{(item.viewCount || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: textMuted }}>浏览</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分`
}
