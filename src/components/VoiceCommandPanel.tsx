'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useVoiceCommands } from '@/hooks/useVoiceCommands'
import { useMetricsSpeak } from '@/hooks/useMetricsSpeak'

// Command definitions for navigation
const NAVIGATION_COMMANDS = [
  { command: '打开仪表盘', action: '/admin', description: '跳转到仪表盘' },
  { command: '打开询盘', action: '/admin/inquiries', description: '跳转到询盘管理' },
  { command: '打开访客', action: '/admin/profiles', description: '跳转到访客分析' },
  { command: '打开内容', action: '/admin/content', description: '跳转到内容管理' },
  { command: '打开用户', action: '/admin/users', description: '跳转到用户管理' },
  { command: '打开分析', action: '/admin/analytics', description: '跳转到数据分析' },
  { command: '打开漏斗', action: '/admin/funnel', description: '跳转到漏斗分析' },
  { command: '打开RFM', action: '/admin/rfm', description: '跳转到RFM分析' },
  { command: '打开工具', action: '/admin/tools', description: '跳转到工具管理' },
  { command: '打开设置', action: '/admin/settings', description: '跳转到系统设置' },
]

// Command definitions for data operations
const DATA_COMMANDS = [
  { command: '筛选今天', action: 'filter_today', description: '筛选今日数据' },
  { command: '筛选昨天', action: 'filter_yesterday', description: '筛选昨日数据' },
  { command: '筛选最近7天', action: 'filter_7days', description: '筛选最近7天' },
  { command: '筛选最近30天', action: 'filter_30days', description: '筛选最近30天' },
  { command: '导出报表', action: 'export', description: '导出当前数据' },
  { command: '刷新数据', action: 'refresh', description: '刷新当前数据' },
  { command: '播报数据', action: 'speak', description: '语音播报关键指标' },
]

interface VoiceCommandPanelProps {
  onNavigate?: (path: string) => void
  onFilterChange?: (filter: string) => void
  onExport?: () => void
  onRefresh?: () => void
  onSpeakMetrics?: () => void
}

export default function VoiceCommandPanel({
  onNavigate,
  onFilterChange,
  onExport,
  onRefresh,
  onSpeakMetrics
}: VoiceCommandPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tenantSlug = searchParams.get('tenant') || 'zxqconsulting'
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showCommands, setShowCommands] = useState(false)
  const { speakAllMetrics, speakText } = useMetricsSpeak()

  // Fetch and speak metrics
  const handleSpeakMetrics = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/overview?tenant=${tenantSlug}`)
      const data = await res.json()
      
      if (data.overview) {
        speakAllMetrics({
          totalVisitors: data.overview.totalVisitors,
          totalPageViews: data.overview.totalPageViews,
          todayVisitors: data.overview.todayVisitors,
          yesterdayVisitors: data.overview.yesterdayVisitors,
          conversionRate: data.overview.conversionRate,
          avgDuration: data.overview.avgDuration,
          bounceRate: data.overview.bounceRate,
          inquiries: data.overview.inquiries,
          leads: data.overview.leads,
          topCountry: data.overview.topCountry,
        })
      } else {
        speakText('暂无数据')
      }
    } catch (error) {
      speakText('获取数据失败')
    }
  }, [tenantSlug, speakAllMetrics, speakText])

  // Build commands based on props
  const getCommands = useCallback(() => {
    const commands: Record<string, () => void> = {}

    // Navigation commands
    NAVIGATION_COMMANDS.forEach(({ command, action }) => {
      commands[command] = () => {
        router.push(action)
        setFeedback(`正在跳转到: ${command.replace('打开', '')}`)
        setTimeout(() => setFeedback(null), 2000)
      }
    })

    // Data filter commands
    if (onFilterChange) {
      DATA_COMMANDS.filter(c => c.action.startsWith('filter_')).forEach(({ command, action }) => {
        commands[command] = () => {
          onFilterChange(action)
          setFeedback(`已设置筛选: ${command.replace('筛选', '')}`)
          setTimeout(() => setFeedback(null), 2000)
        }
      })
    }

    // Export command
    if (onExport) {
      commands['导出报表'] = () => {
        onExport()
        setFeedback('正在导出报表...')
        setTimeout(() => setFeedback(null), 2000)
      }
    }

    // Refresh command
    if (onRefresh) {
      commands['刷新数据'] = () => {
        onRefresh()
        setFeedback('正在刷新数据...')
        setTimeout(() => setFeedback(null), 2000)
      }
    }

    // Speak metrics command - always available
    commands['播报数据'] = () => {
      handleSpeakMetrics()
      setFeedback('正在播报数据...')
      setTimeout(() => setFeedback(null), 2000)
    }

    return commands
  }, [router, onNavigate, onFilterChange, onExport, onRefresh, handleSpeakMetrics])

  const {
    isListening,
    isSupported,
    lastCommand,
    error,
    startListening,
    stopListening,
    speak
  } = useVoiceCommands({
    commands: Object.entries(getCommands()).map(([command, callback]) => ({
      command,
      callback
    })),
    enabled: isOpen,
    language: 'zh-CN'
  })

  // Provide speak function to parent components
  useEffect(() => {
    (window as any).__voiceSpeak = speak
  }, [speak])

  const handleToggle = () => {
    if (isOpen) {
      stopListening()
      setIsOpen(false)
    } else {
      setIsOpen(true)
      setTimeout(() => startListening(), 100)
    }
  }

  if (!isSupported) {
    return null
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={handleToggle}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isListening
            ? 'bg-red-500 animate-pulse'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
        }`}
        title={isListening ? '正在聆听...' : '语音命令'}
      >
        {isListening ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
              <span className="text-white font-medium">
                {isListening ? '正在聆听...' : '语音命令助手'}
              </span>
            </div>
            <button
              onClick={() => setShowCommands(!showCommands)}
              className="text-white/80 hover:text-white text-sm"
            >
              {showCommands ? '隐藏命令' : '显示命令'}
            </button>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className="px-4 py-2 bg-blue-50 text-blue-700 text-sm">
              {feedback}
            </div>
          )}

          {/* Last command */}
          {lastCommand && (
            <div className="px-4 py-2 bg-gray-50 text-gray-600 text-sm">
              识别到: &quot;{lastCommand}&quot;
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">
              错误: {error}
            </div>
          )}

          {/* Command List */}
          {showCommands && (
            <div className="max-h-64 overflow-y-auto">
              {/* Navigation Commands */}
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                快捷导航
              </div>
              <div className="px-4 py-2 space-y-1">
                {NAVIGATION_COMMANDS.slice(0, 6).map(({ command, description }) => (
                  <div key={command} className="flex justify-between text-sm">
                    <span className="text-gray-700">{description}</span>
                    <span className="text-gray-400 text-xs">&quot;{command}&quot;</span>
                  </div>
                ))}
              </div>

              {/* Data Commands */}
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                数据操作
              </div>
              <div className="px-4 py-2 space-y-1">
                {DATA_COMMANDS.map(({ command, description }) => (
                  <div key={command} className="flex justify-between text-sm">
                    <span className="text-gray-700">{description}</span>
                    <span className="text-gray-400 text-xs">&quot;{command}&quot;</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
            <button
              onClick={startListening}
              disabled={isListening}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                isListening
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
            >
              {isListening ? '聆听中...' : '开始监听'}
            </button>
            <button
              onClick={stopListening}
              disabled={!isListening}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                !isListening
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
            >
              停止
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// Export speak function for external use
export function speakText(text: string) {
  if ((window as any).__voiceSpeak) {
    (window as any).__voiceSpeak(text)
  } else if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 1
    window.speechSynthesis.speak(utterance)
  }
}
