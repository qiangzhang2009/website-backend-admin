/**
 * 管理后台密码验证
 * 使用 HttpOnly Cookie 存储服务端会话，彻底替换 localStorage 方案
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lock, Loader2 } from 'lucide-react'

const AUTH_API = '/api/admin/auth'

export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(AUTH_API, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setStatus(data.authenticated ? 'authenticated' : 'unauthenticated')
      } else {
        setStatus('unauthenticated')
      }
    } catch {
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleLogin = async (password: string): Promise<string | null> => {
    const res = await fetch(`${AUTH_API}?action=login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (!res.ok) return data.error || 'Login failed'
    setStatus('authenticated')
    return null
  }

  const handleLogout = async () => {
    await fetch(`${AUTH_API}?action=logout`, {
      method: 'POST',
      credentials: 'include',
    })
    setStatus('unauthenticated')
  }

  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      }}>
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: '40px 32px',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Loader2 size={32} color="white" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1f2937', margin: '0 0 8px' }}>
            数据管理系统
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>验证中...</p>
        </div>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <>
        {children}
      </>
    )
  }

  return <LoginUI onLogin={handleLogin} />
}

function LoginUI({ onLogin }: { onLogin: (password: string) => Promise<string | null> }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('请输入密码')
      return
    }
    setLoading(true)
    setError('')
    const err = await onLogin(password)
    if (err) {
      setError(err)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '40px 32px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Lock size={32} color="white" />
          </div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 600,
            color: '#1f2937',
            margin: '0 0 8px',
          }}>
            管理后台
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            请输入管理密码访问
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              color: '#374151',
              marginBottom: 6,
            }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入管理密码"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                border: error ? '1px solid #ef4444' : '1px solid #d1d5db',
                fontSize: 16,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                opacity: loading ? 0.6 : 1,
              }}
              onFocus={(e) => { e.target.style.borderColor = '#4f46e5' }}
              onBlur={(e) => { if (!error) e.target.style.borderColor = '#d1d5db' }}
            />
            {error && (
              <p style={{ color: '#ef4444', fontSize: 14, margin: '6px 0 0' }}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                验证中...
              </>
            ) : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
