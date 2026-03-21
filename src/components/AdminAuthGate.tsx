/**
 * 管理后台密码验证
 * 使用 localStorage 存储验证状态，环境变量存储密码
 * 修复：添加 mounted 状态避免 Next.js SSR/CSR hydration 不匹配
 */

'use client'

import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'

export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const auth = localStorage.getItem('admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('admin_auth', 'true')
      setIsAuthenticated(true)
      setError('')
    } else {
      setError('密码错误，请重试')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_auth')
    setIsAuthenticated(false)
  }

  // SSR 或未挂载时：渲染与客户端一致的 loading UI（避免 hydration mismatch）
  if (!mounted) {
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
            <Lock size={32} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1f2937', margin: '0 0 8px' }}>
            数据管理系统
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>加载中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
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
              background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)',
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
            <p style={{
              color: '#6b7280',
              margin: 0,
            }}>
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
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: error ? '1px solid #ef4444' : '1px solid #d1d5db',
                  fontSize: 16,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4f46e5'
                }}
                onBlur={(e) => {
                  if (!error) e.target.style.borderColor = '#d1d5db'
                }}
              />
              {error && (
                <p style={{
                  color: '#ef4444',
                  fontSize: 14,
                  margin: '6px 0 0',
                }}>
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              登录
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            marginTop: 24,
            fontSize: 12,
            color: '#9ca3af',
          }}>
            默认密码: admin123
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {children}
    </>
  )
}

export { ADMIN_PASSWORD }
