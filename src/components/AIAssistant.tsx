'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button, Input, Avatar, Spin, Badge, Drawer, List, Tooltip } from 'antd'
import { SendOutlined, CloseOutlined, RobotOutlined, SoundOutlined, AudioOutlined } from '@ant-design/icons'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIAssistantProps {
  tenantSlug?: string
  visible?: boolean
  onClose?: () => void
}

export default function AIAssistant({ tenantSlug = 'zxqconsulting', visible = false, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(visible)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  // Sync with visible prop
  useEffect(() => {
    setIsOpen(visible)
  }, [visible])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Text to speech
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    setIsSpeaking(true)

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [])

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  // Speech recognition (using Web Speech API)
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('您的浏览器不支持语音识别功能')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      handleSend(transcript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
    }

    recognition.start()
    recognitionRef.current = recognition
  }, [])

  // Send message to AI
  const handleSend = useCallback(async (text?: string) => {
    const messageText = text || input
    if (!messageText.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          tenant: tenantSlug,
          history: messages.slice(-5)
        })
      })

      const data = await res.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || '抱歉，我暂时无法回答这个问题',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Auto-speak if enabled
      if (data.speak) {
        speak(data.response)
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发生了错误，请稍后重试',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }, [input, messages, tenantSlug, speak])

  // Quick actions
  const quickActions = [
    { label: '今日数据', prompt: '告诉我今天的数据概况' },
    { label: '转化分析', prompt: '分析一下转化漏斗' },
    { label: '访客来源', prompt: '访客主要来自哪些地区' },
    { label: '询盘统计', prompt: '最近询盘情况如何' },
  ]

  return (
    <>
      {/* Floating Button */}
      <Tooltip title="AI 智能助手">
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 flex items-center justify-center transition-all duration-300"
        >
          <RobotOutlined className="text-white text-xl" />
        </button>
      </Tooltip>

      {/* Chat Drawer */}
      <Drawer
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RobotOutlined className="text-xl text-indigo-500" />
              <span>AI 智能助手</span>
              <Badge status="processing" text="在线" />
            </div>
            {isSpeaking && (
              <Button
                type="text"
                size="small"
                icon={<SoundOutlined spin />}
                onClick={stopSpeaking}
              >
                停止播报
              </Button>
            )}
          </div>
        }
        placement="right"
        onClose={() => {
          setIsOpen(false)
          onClose?.()
        }}
        open={isOpen}
        width={420}
        footer={
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onPressEnter={() => handleSend()}
              placeholder="输入您的问题..."
              disabled={loading}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => handleSend()}
              loading={loading}
            >
              发送
            </Button>
          </div>
        }
      >
        {/* Quick Actions */}
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-2">快捷问题：</div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map(action => (
              <Button
                key={action.label}
                size="small"
                onClick={() => handleSend(action.prompt)}
                disabled={loading}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Voice Input */}
        <div className="mb-4 flex justify-center">
          <Button
            icon={<AudioOutlined />}
            onClick={startListening}
            disabled={loading}
          >
            语音输入
          </Button>
        </div>

        {/* Messages */}
        <div className="h-[calc(100vh-300px)] overflow-y-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <RobotOutlined className="text-4xl mb-4" />
              <p>您好！我是您的数据分析助手</p>
              <p className="text-sm">可以问我关于数据的问题</p>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar
                size="small"
                icon={msg.role === 'user' ? 'U' : <RobotOutlined />}
                className={msg.role === 'user' ? 'bg-blue-500' : 'bg-indigo-500'}
              />
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="text-sm">{msg.content}</div>
                <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2">
              <Avatar size="small" icon={<RobotOutlined />} className="bg-indigo-500" />
              <div className="bg-gray-100 p-3 rounded-lg">
                <Spin size="small" />
                <span className="ml-2 text-gray-500">思考中...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </Drawer>
    </>
  )
}
