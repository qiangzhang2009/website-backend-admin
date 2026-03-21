/**
 * 语音命令 Hook
 * 基于 annyang.js 实现语音识别功能
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

declare global {
  interface Window {
    annyang: any
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface VoiceCommand {
  command: string
  callback: () => void
}

interface UseVoiceCommandsOptions {
  commands: VoiceCommand[]
  enabled?: boolean
  language?: string
}

export function useVoiceCommands({
  commands,
  enabled = true,
  language = 'zh-CN'
}: UseVoiceCommandsOptions) {
  const router = useRouter()
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [lastCommand, setLastCommand] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const annyangRef = useRef<any>(null)

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)

    if (!enabled || !SpeechRecognition) return

    // Load annyang dynamically
    const loadAnnyang = async () => {
      if (window.annyang) {
        annyangRef.current = window.annyang
        setupCommands()
        return
      }

      // Inject annyang script
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/annyang/2.6.1/annyang.min.js'
      script.async = true
      script.onload = () => {
        annyangRef.current = window.annyang
        setupCommands()
      }
      script.onerror = () => {
        setError('Failed to load speech recognition library')
      }
      document.head.appendChild(script)
    }

    const setupCommands = () => {
      if (!annyangRef.current) return

      const cmdMap: Record<string, () => void> = {}
      commands.forEach(({ command, callback }) => {
        cmdMap[command] = callback
      })

      annyangRef.current.addCommands(cmdMap)
      annyangRef.current.setLanguage(language)

      annyangRef.current.addListener('start', () => {
        setIsListening(true)
        setError(null)
      })

      annyangRef.current.addListener('end', () => {
        setIsListening(false)
      })

      annyangRef.current.addListener('result', (phrases: string[]) => {
        if (phrases.length > 0) {
          setLastCommand(phrases[0])
        }
      })

      annyangRef.current.addListener('error', (err: any) => {
        setError(err.error)
        setIsListening(false)
      })
    }

    loadAnnyang()

    return () => {
      if (annyangRef.current) {
        annyangRef.current.abort()
      }
    }
  }, [commands, enabled, language])

  const startListening = useCallback(() => {
    if (annyangRef.current && isSupported) {
      annyangRef.current.start({ autoRestart: false })
    }
  }, [isSupported])

  const stopListening = useCallback(() => {
    if (annyangRef.current) {
      annyangRef.current.abort()
    }
  }, [])

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language
      utterance.rate = 1
      window.speechSynthesis.speak(utterance)
    }
  }, [language])

  return {
    isListening,
    isSupported,
    lastCommand,
    error,
    startListening,
    stopListening,
    speak
  }
}
