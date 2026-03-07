/**
 * 模块使用分析页面
 */
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface ModuleStat {
  module: string
  total: number
  completed: number
  abandoned: number
  avgTime: string
  completionRate: number
}

interface ModuleUsage {
  module_id: string
  module_name: string
  event_type: string
  duration_seconds: number
  conversation_turns: number
  created_at: string
}

const MODULE_NAMES: Record<string, string> = {
  bazi: '八字分析',
  fengshui: '风水布局',
  tarot: '塔罗牌',
  palm: '手相',
  dream: '周公解梦',
  zodiac: '星座运势',
  mbti: 'MBTI测试',
  draw: '抽签',
  huangdi: '黄帝内经',
  lifenumber: '生命灵数',
  ziwei: '紫微斗数',
  zhouyi: '周易',
  naming: '起名',
  marriage: '婚配',
  company: '公司起名',
  luckyday: '吉日',
  digital: '数字命理',
  daodejing: '道德经',
  question: '问卦',
  // 中医药出海工具
  market: '市场选择器',
  cost: '成本计算器',
  policy: '政策查询',
  decision: '决策工作台',
}

export default function ModulesPage() {
  const searchParams = useSearchParams()
  const tenant = searchParams.get('tenant') || 'zxqconsulting'
  
  const [stats, setStats] = useState<Record<string, ModuleStat>>({})
  const [recentUsage, setRecentUsage] = useState<ModuleUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'stats' | 'usage'>('stats')

  useEffect(() => {
    fetchData()
  }, [tenant])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/modules?tenant=${tenant}`)
      const data = await res.json()
      
      if (data.stats) {
        setStats(data.stats)
      }
      if (data.data) {
        setRecentUsage(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch module data:', error)
    } finally {
      setLoading(false)
    }
  }

  const moduleList = Object.entries(stats).map(([module, stat]) => ({
    id: module,
    name: MODULE_NAMES[module] || module,
    ...stat,
  }))

  const totalUsage = Object.values(stats).reduce((sum, s) => sum + s.total, 0)
  const totalCompleted = Object.values(stats).reduce((sum, s) => sum + s.completed, 0)
  const avgCompletionRate = totalUsage > 0 ? ((totalCompleted / totalUsage) * 100).toFixed(1) : '0'

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">模块使用分析</h1>
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
          <div className="text-2xl font-bold text-blue-600">{totalUsage}</div>
          <div className="text-sm text-gray-500">总使用次数</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{moduleList.length}</div>
          <div className="text-sm text-gray-500">活跃模块数</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-yellow-600">{totalCompleted}</div>
          <div className="text-sm text-gray-500">完成次数</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{avgCompletionRate}%</div>
          <div className="text-sm text-gray-500">平均完成率</div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'stats' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          统计概览
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'usage' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          使用记录
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : activeTab === 'stats' ? (
        /* 模块统计表格 */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模块</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">使用次数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">完成</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">放弃</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">平均时长</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">完成率</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">热度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {moduleList.sort((a, b) => b.total - a.total).map((module) => (
                <tr key={module.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {module.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-blue-600 font-semibold">{module.total}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-green-600">{module.completed}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-red-500">{module.abandoned}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {module.avgTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            module.completionRate >= 70 ? 'bg-green-500' :
                            module.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${module.completionRate}%` }}
                        />
                      </div>
                      <span className="text-sm">{module.completionRate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <HeatBar value={module.total} max={moduleList[0]?.total || 1} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* 使用记录列表 */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模块</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">事件类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时长(秒)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">对话轮次</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentUsage.slice(0, 50).map((usage, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(usage.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {MODULE_NAMES[usage.module_id] || usage.module_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <EventTypeBadge type={usage.event_type} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {usage.duration_seconds || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {usage.conversation_turns || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// 热度条组件
function HeatBar({ value, max }: { value: number; max: number }) {
  const percentage = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="w-24 bg-gray-200 rounded-full h-2">
      <div 
        className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

// 事件类型标签
function EventTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    start: 'bg-green-100 text-green-800',
    input: 'bg-blue-100 text-blue-800',
    output: 'bg-purple-100 text-purple-800',
    complete: 'bg-green-100 text-green-800',
    abandon: 'bg-red-100 text-red-800',
    tool_start: 'bg-green-100 text-green-800',
    tool_input: 'bg-blue-100 text-blue-800',
    tool_output: 'bg-purple-100 text-purple-800',
    tool_complete: 'bg-green-100 text-green-800',
    tool_abandon: 'bg-red-100 text-red-800',
  }
  
  const labels: Record<string, string> = {
    start: '开始',
    input: '输入',
    output: '输出',
    complete: '完成',
    abandon: '放弃',
    tool_start: '开始',
    tool_input: '输入',
    tool_output: '输出',
    tool_complete: '完成',
    tool_abandon: '放弃',
  }
  
  const color = colors[type] || 'bg-gray-100 text-gray-800'
  const label = labels[type] || type
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
      {label}
    </span>
  )
}
