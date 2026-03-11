/**
 * 内容热度分析页面
 */
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

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

export default function ContentPage() {
  const searchParams = useSearchParams()
  const tenant = searchParams.get('tenant') || 'zxqconsulting'
  
  const [data, setData] = useState<ContentItem[]>([])
  const [summary, setSummary] = useState<{ totalViews: number; totalUniqueViewers: number; totalInteractions: number; topContent: ContentItem[] }>({
    totalViews: 0,
    totalUniqueViewers: 0,
    totalInteractions: 0,
    topContent: [],
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [contentType, setContentType] = useState('')

  useEffect(() => {
    fetchData()
  }, [tenant, contentType])

  async function fetchData() {
    setLoading(true)
    try {
      const baseUrl = window.location.origin
      const url = new URL(`/api/admin/content?tenant=${tenant}`, baseUrl)
      if (contentType) url.searchParams.append('type', contentType)
      
      const res = await fetch(url.toString())
      const result = await res.json()
      
      if (result.data) {
        setData(result.data)
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

  const filteredData = data.filter(item => 
    !filter || 
    item.contentName?.includes(filter) || 
    item.contentId?.includes(filter)
  )

  const typeStats = {
    tool: filteredData.filter(c => c.contentType === 'tool'),
    page: filteredData.filter(c => c.contentType === 'page'),
    article: filteredData.filter(c => c.contentType === 'article'),
    module: filteredData.filter(c => c.contentType === 'module'),
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">内容热度分析</h1>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          刷新数据
        </button>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{(summary.totalViews || 0).toLocaleString()}</div>
          <div className="text-sm text-gray-500">总浏览量</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{(summary.totalUniqueViewers || 0).toLocaleString()}</div>
          <div className="text-sm text-gray-500">独立访客</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{(summary.totalInteractions || 0).toLocaleString()}</div>
          <div className="text-sm text-gray-500">互动次数</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">{data.length}</div>
          <div className="text-sm text-gray-500">内容条目</div>
        </div>
      </div>

      {/* 类型筛选 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setContentType('')}
          className={`px-4 py-2 rounded-lg ${contentType === '' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          全部 ({data.length})
        </button>
        <button
          onClick={() => setContentType('tool')}
          className={`px-4 py-2 rounded-lg ${contentType === 'tool' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          工具 ({typeStats.tool.length})
        </button>
        <button
          onClick={() => setContentType('page')}
          className={`px-4 py-2 rounded-lg ${contentType === 'page' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          页面 ({typeStats.page.length})
        </button>
        <button
          onClick={() => setContentType('module')}
          className={`px-4 py-2 rounded-lg ${contentType === 'module' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          模块 ({typeStats.module.length})
        </button>
        <button
          onClick={() => setContentType('article')}
          className={`px-4 py-2 rounded-lg ${contentType === 'article' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          文章 ({typeStats.article.length})
        </button>
      </div>

      {/* 搜索 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索内容..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg w-64"
        />
      </div>

      {/* 内容列表 */}
      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无数据</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">内容</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">浏览量</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">独立访客</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">平均停留</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">互动数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最后浏览</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">热度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.sort((a, b) => b.viewCount - a.viewCount).map((item) => (
                <tr key={`${item.contentType}-${item.contentId}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{item.contentName || item.contentId}</div>
                    <div className="text-xs text-gray-500">{item.contentId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TypeBadge type={item.contentType} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-blue-600 font-semibold">{(item.viewCount || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {(item.uniqueViewers || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {formatDuration(item.avgDuration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={item.interactionCount > 0 ? 'text-purple-600' : 'text-gray-400'}>
                      {(item.interactionCount || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.lastViewedAt ? new Date(item.lastViewedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <HeatBar value={item.viewCount} max={filteredData[0]?.viewCount || 1} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top 内容 */}
      {summary.topContent && summary.topContent.length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">🔥 热门内容 TOP 5</h2>
          <div className="space-y-3">
            {summary.topContent.map((item, idx) => (
              <div key={item.contentId} className="flex items-center gap-4">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                  idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-blue-300'
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{item.contentName || item.contentId}</div>
                  <div className="text-xs text-gray-500">{item.contentType}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-blue-600">{(item.viewCount || 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">浏览</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 类型徽章
function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    tool: 'bg-purple-100 text-purple-800',
    page: 'bg-blue-100 text-blue-800',
    article: 'bg-green-100 text-green-800',
    module: 'bg-orange-100 text-orange-800',
  }
  
  const labels: Record<string, string> = {
    tool: '工具',
    page: '页面',
    article: '文章',
    module: '模块',
  }
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
      {labels[type] || type}
    </span>
  )
}

// 热度条
function HeatBar({ value, max }: { value: number; max: number }) {
  const percentage = max > 0 ? (value / max) * 100 : 0
  
  // 根据热度值返回不同的颜色
  const getColor = () => {
    if (percentage >= 80) return 'bg-red-500'
    if (percentage >= 60) return 'bg-orange-500'
    if (percentage >= 40) return 'bg-yellow-500'
    return 'bg-blue-400'
  }
  
  return (
    <div className="w-24 bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full ${getColor()}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

// 格式化时长
function formatDuration(seconds: number): string {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分`
}
