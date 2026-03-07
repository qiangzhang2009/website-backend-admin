/**
 * RFM 用户价值分析页面
 */
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface RfmData {
  visitorId: string
  rScore: number
  fScore: number
  mScore: number
  rfmScore: number
  rfmSegment: string
  calculatedAt: string
}

interface RfmSummary {
  VIP: number
  Regular: number
  At_Risk: number
  Lost: number
  total: number
}

const SEGMENT_COLORS: Record<string, string> = {
  VIP: 'bg-gradient-to-r from-yellow-400 to-orange-500',
  Regular: 'bg-gradient-to-r from-blue-400 to-blue-600',
  At_Risk: 'bg-gradient-to-r from-red-400 to-red-600',
  Lost: 'bg-gradient-to-r from-gray-400 to-gray-600',
}

const SEGMENT_LABELS: Record<string, string> = {
  VIP: '高价值用户',
  Regular: '普通用户',
  At_Risk: '风险用户',
  Lost: '流失用户',
}

export default function RfmPage() {
  const searchParams = useSearchParams()
  const tenant = searchParams.get('tenant') || 'zxqconsulting'
  
  const [data, setData] = useState<RfmData[]>([])
  const [summary, setSummary] = useState<RfmSummary>({ VIP: 0, Regular: 0, At_Risk: 0, Lost: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState('')

  useEffect(() => {
    fetchData()
  }, [tenant, selectedSegment])

  async function fetchData() {
    setLoading(true)
    try {
      const url = new URL(`/api/admin/rfm?tenant=${tenant}`)
      if (selectedSegment) url.searchParams.append('segment', selectedSegment)
      
      const res = await fetch(url.toString())
      const result = await res.json()
      
      if (result.data) {
        setData(result.data)
      }
      if (result.summary) {
        setSummary(result.summary)
      }
    } catch (error) {
      console.error('Failed to fetch RFM data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function calculateRfm() {
    setCalculating(true)
    try {
      const res = await fetch(`/api/admin/rfm?tenant=${tenant}`, { method: 'POST' })
      const result = await res.json()
      
      if (result.success) {
        alert(`RFM 计算完成，共处理 ${result.processed} 条记录`)
        fetchData()
      }
    } catch (error) {
      console.error('Failed to calculate RFM:', error)
      alert('RFM 计算失败')
    } finally {
      setCalculating(false)
    }
  }

  const segments = [
    { key: '', label: '全部', count: summary.total },
    { key: 'VIP', label: '高价值用户', count: summary.VIP, color: 'from-yellow-400 to-orange-500' },
    { key: 'Regular', label: '普通用户', count: summary.Regular, color: 'from-blue-400 to-blue-600' },
    { key: 'At_Risk', label: '风险用户', count: summary.At_Risk, color: 'from-red-400 to-red-600' },
    { key: 'Lost', label: '流失用户', count: summary.Lost, color: 'from-gray-400 to-gray-600' },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">RFM 用户价值分析</h1>
        <button
          onClick={calculateRfm}
          disabled={calculating}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
        >
          {calculating ? '计算中...' : '重新计算 RFM'}
        </button>
      </div>

      {/* 分段统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {segments.slice(1).map((seg) => (
          <button
            key={seg.key}
            onClick={() => setSelectedSegment(seg.key)}
            className={`p-4 rounded-lg shadow text-white transition-transform hover:scale-105 ${
              selectedSegment === seg.key ? 'ring-4 ring-offset-2 ring-blue-500' : ''
            } bg-gradient-to-r ${seg.color}`}
          >
            <div className="text-3xl font-bold">{seg.count}</div>
            <div className="text-sm opacity-90">{seg.label}</div>
            <div className="text-xs opacity-75 mt-1">
              {summary.total > 0 ? ((seg.count / summary.total) * 100).toFixed(1) : 0}%
            </div>
          </button>
        ))}
      </div>

      {/* 整体概览 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">用户分布</h2>
        <div className="flex h-6 rounded-full overflow-hidden">
          {segments.slice(1).map((seg) => (
            <div
              key={seg.key}
              className={`h-full bg-gradient-to-r ${seg.color} transition-all`}
              style={{ width: summary.total > 0 ? `${(seg.count / summary.total) * 100}%` : '0%' }}
              title={`${SEGMENT_LABELS[seg.key]}: ${seg.count}`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-500">
          <span>VIP: {summary.VIP}</span>
          <span>普通: {summary.Regular}</span>
          <span>风险: {summary.At_Risk}</span>
          <span>流失: {summary.Lost}</span>
        </div>
      </div>

      {/* RFM 筛选 */}
      <div className="flex gap-2 mb-4">
        {segments.map((seg) => (
          <button
            key={seg.key}
            onClick={() => setSelectedSegment(seg.key)}
            className={`px-4 py-2 rounded-lg text-sm ${
              selectedSegment === seg.key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {seg.label} ({seg.count})
          </button>
        ))}
      </div>

      {/* RFM 详情表格 */}
      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          暂无数据，请先点击&quot;重新计算 RFM&quot;
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">访客ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">R分数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">F分数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">M分数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFM总分</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户分群</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">计算时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item) => (
                <tr key={item.visitorId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500">
                    {item.visitorId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ScoreBadge score={item.rScore} label="最近访问" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ScoreBadge score={item.fScore} label="访问频率" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ScoreBadge score={item.mScore} label="行为价值" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xl font-bold text-gray-700">{item.rfmScore}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <SegmentBadge segment={item.rfmSegment} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.calculatedAt ? new Date(item.calculatedAt).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RFM 说明 */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">RFM 分析说明</h3>
        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <div className="font-medium text-gray-700">R (Recency) - 最近访问</div>
            <div>5分：7天内访问 | 4分：14天内 | 3分：30天内 | 2分：90天内 | 1分：超过90天</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">F (Frequency) - 访问频率</div>
            <div>5分：超过10次 | 4分：5-10次 | 3分：2-4次 | 2分：2次 | 1分：1次</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">M (Monetary) - 行为价值</div>
            <div>5分：超过20次行为 | 4分：10-20次 | 3分：5-10次 | 2分：2-5次 | 1分：1次</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 分数徽章
function ScoreBadge({ score, label }: { score: number; label: string }) {
  const colors = [
    'bg-gray-100 text-gray-600',
    'bg-red-100 text-red-600',
    'bg-orange-100 text-orange-600',
    'bg-yellow-100 text-yellow-600',
    'bg-blue-100 text-blue-600',
    'bg-green-100 text-green-600',
  ]
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${colors[score] || colors[0]}`}>
        {score}
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}

// 分群徽章
function SegmentBadge({ segment }: { segment: string }) {
  const colors: Record<string, string> = {
    VIP: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
    Regular: 'bg-gradient-to-r from-blue-400 to-blue-600 text-white',
    At_Risk: 'bg-gradient-to-r from-red-400 to-red-600 text-white',
    Lost: 'bg-gradient-to-r from-gray-400 to-gray-600 text-white',
  }
  
  const labels: Record<string, string> = {
    VIP: '高价值',
    Regular: '普通',
    At_Risk: '风险',
    Lost: '流失',
  }
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[segment] || 'bg-gray-100 text-gray-600'}`}>
      {labels[segment] || segment}
    </span>
  )
}
