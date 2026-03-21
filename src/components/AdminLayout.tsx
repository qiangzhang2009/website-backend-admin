/**
 * 后台管理系统布局
 * 包含侧边栏、头部和租户切换（租户列表来自 /api/admin/sites）
 * 支持亮色/深色主题切换
 */

'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button, Space, ConfigProvider, theme, Input, AutoComplete, Spin } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  MessageOutlined,
  BarChartOutlined,
  ToolOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  GlobalOutlined,
  FundOutlined,
  AppstoreOutlined,
  SunOutlined,
  MoonOutlined,
  SearchOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import VoiceCommandPanel from './VoiceCommandPanel'
import AIAssistant from './AIAssistant'

const { Header, Sider, Content } = Layout
const { defaultAlgorithm, darkAlgorithm } = theme

// 主题上下文
type ThemeMode = 'light' | 'dark'
interface ThemeContextType {
  mode: ThemeMode
  toggleTheme: () => void
}
const ThemeContext = createContext<ThemeContextType>({ mode: 'light', toggleTheme: () => {} })

// 亮色主题色板（专业科技风 - 清新专业）
const lightTheme = {
  algorithm: defaultAlgorithm,
  token: {
    colorPrimary: '#4f46e5',       // 靛蓝主色
    colorSuccess: '#10b981',        // 翠绿
    colorWarning: '#f59e0b',        // 琥珀
    colorError: '#ef4444',          // 红
    colorInfo: '#4f46e5',
    colorText: '#1f2937',           // 深灰文字
    colorTextSecondary: '#6b7280',
    colorBorder: '#e5e7eb',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    Layout: {
      siderBg: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
      headerBg: '#ffffff',
      bodyBg: '#f3f4f6',
    },
    Card: {
      colorBgContainer: '#ffffff',
    },
    Table: {
      headerBg: '#f9fafb',
      headerColor: '#374151',
      rowHoverBg: '#f9fafb',
    },
  },
}

// 深色主题色板（专业深色 UI - 遵循 WCAG 对比度标准）
const darkTheme = {
  token: {
    colorPrimary: '#818cf8',       // 柔和靛蓝（易辨认）
    colorSuccess: '#4ade80',        // 亮绿
    colorWarning: '#fbbf24',        // 亮琥珀
    colorError: '#f87171',          // 柔和红
    colorInfo: '#818cf8',
    // 关键：文字颜色必须足够亮才能在深色背景上清晰阅读
    colorText: '#e5e7eb',           // 主文字 - 浅灰白 (对比度 7.5:1)
    colorTextSecondary: '#9ca3af',  // 次要文字 - 中灰 (对比度 4.5:1)
    colorTextTertiary: '#6b7280',  // 辅助文字
    colorBorder: '#374151',         // 边框 - 深灰（可见但不刺眼）
    colorBorderSecondary: '#4b5563',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  algorithm: darkAlgorithm,               // 启用 Ant Design 官方深色算法
  components: {
    Layout: {
      siderBg: 'linear-gradient(180deg, #111827 0%, #1f2937 100%)',  // 深灰蓝
      headerBg: '#1f2937',          // 稍浅的深灰
      bodyBg: '#111827',            // 最深的背景
    },
    Card: {
      colorBgContainer: '#1f2937',  // 卡片背景
      colorBgElevated: '#374151',   // 浮起元素
      colorTextTitle: '#f3f4f6',    // 标题文字
    },
    Table: {
      headerBg: '#374151',          // 表头深灰
      headerColor: '#f9fafb',        // 表头白字
      rowHoverBg: '#374151',        // 行悬停
      colorBgContainer: '#1f2937',
      borderColor: '#374151',
      colorText: '#e5e7eb',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(129, 140, 248, 0.2)',
      darkItemHoverBg: 'rgba(129, 140, 248, 0.1)',
      darkItemColor: '#d1d5db',
      darkItemSelectedColor: '#818cf8',
    },
    Input: {
      colorBgContainer: '#374151',
      colorBorder: '#4b5563',
      colorText: '#e5e7eb',
      colorTextPlaceholder: '#9ca3af',
    },
    Select: {
      colorBgContainer: '#374151',
      colorBorder: '#4b5563',
      optionSelectedBg: '#4f46e5',
    },
    Button: {
      primaryShadow: '0 2px 4px rgba(0,0,0,0.3)',
    },
    Statistic: {
      colorTextDescription: '#9ca3af',
    },
    Tag: {
      defaultBg: '#374151',
      defaultColor: '#d1d5db',
    },
    DatePicker: {
      colorBgContainer: '#374151',
      colorBorder: '#4b5563',
      colorText: '#e5e7eb',
      colorTextPlaceholder: '#9ca3af',
    },
    Dropdown: {
      colorBgElevated: '#1f2937',
    },
    Modal: {
      contentBg: '#1f2937',
      headerBg: '#1f2937',
    },
  },
}

// 导出主题工具函数
export function useTheme() {
  const { mode } = useContext(ThemeContext)
  const isDark = mode === 'dark'
  
  return {
    isDark,
    // 图表颜色配置
    chartColors: isDark 
      ? ['#818cf8', '#4ade80', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#34d399', '#fb923c']
      : ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#22c55e', '#f97316'],
    // 背景色
    cardBg: isDark ? '#1f2937' : '#ffffff',
    componentBg: isDark ? '#374151' : '#ffffff',
    // 文字色
    textPrimary: isDark ? '#f3f4f6' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    textMuted: isDark ? '#6b7280' : '#9ca3af',
    // 边框色
    borderColor: isDark ? '#374151' : '#e5e7eb',
    // 特定颜色
    successColor: isDark ? '#4ade80' : '#10b981',
    warningColor: isDark ? '#fbbf24' : '#f59e0b',
    errorColor: isDark ? '#f87171' : '#ef4444',
    infoColor: isDark ? '#818cf8' : '#3b82f6',
  }
}

interface Tenant {
  id?: string
  name: string
  slug: string
}

interface AdminLayoutProps {
  children: React.ReactNode
}

// 主题提供者组件
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('admin-theme-mode') as ThemeMode
    if (saved) {
      setMode(saved)
    } else {
      // 默认跟随系统
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setMode(prefersDark ? 'dark' : 'light')
    }
  }, [])

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light'
    setMode(newMode)
    localStorage.setItem('admin-theme-mode', newMode)
  }

  const themeConfig = mode === 'light' ? lightTheme : darkTheme

  // 始终包裹在 Context 中，避免 hooks 顺序不一致
  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ConfigProvider theme={themeConfig}>
        {/* mounted 前显示占位符，避免闪烁 */}
        {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}

// 全局搜索组件
function GlobalSearch({ tenantSlug }: { tenantSlug: string | null }) {
  const [searchText, setSearchText] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = useCallback(async (value: string) => {
    if (!value || !tenantSlug) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/search?tenant=${tenantSlug}&q=${encodeURIComponent(value)}`)
      const data = await res.json()
      
      const searchResults: any[] = []
      if (data.users?.length) {
        data.users.forEach((item: any) => {
          searchResults.push({ value: item.title, type: '用户', key: item.id })
        })
      }
      if (data.inquiries?.length) {
        data.inquiries.forEach((item: any) => {
          searchResults.push({ value: item.title, type: '询盘', key: item.id })
        })
      }
      if (data.chat?.length) {
        data.chat.forEach((item: any) => {
          searchResults.push({ value: item.title, type: '会话', key: item.id })
        })
      }
      setResults(searchResults)
    } catch (e) {
      console.error('Search error:', e)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [tenantSlug])

  return (
    <AutoComplete
      style={{ width: 200 }}
      options={results}
      onSearch={handleSearch}
      placeholder="搜索用户/询盘/会话..."
    >
      <Input 
        prefix={loading ? <Spin size="small" /> : <SearchOutlined />} 
      />
    </AutoComplete>
  )
}

// 主题切换按钮组件
function ThemeToggle() {
  const { mode, toggleTheme } = useContext(ThemeContext)
  
  return (
    <Button
      type="text"
      icon={mode === 'light' ? <MoonOutlined /> : <SunOutlined />}
      onClick={toggleTheme}
      style={{ 
        fontSize: 18,
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title={mode === 'light' ? '切换到深色模式' : '切换到亮色模式'}
    />
  )
}

// 导出带主题的布局（默认导出）
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ThemeProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </ThemeProvider>
  )
}

// 内部布局内容组件
function AdminLayoutContent({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantsLoading, setTenantsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { mode } = useContext(ThemeContext)

  // 从 URL 获取当前租户
  const currentTenantSlug = searchParams.get('tenant')
  const selectedTenant = tenants.find(t => t.slug === currentTenantSlug) || tenants[0] || null

  useEffect(() => {
    let cancelled = false
    setTenantsLoading(true)
    fetch('/api/admin/sites')
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to load sites')))
      .then(data => {
        if (cancelled) return
        const list = (data.sites ?? []).map((s: { id: string; name: string; slug: string }) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
        }))
        setTenants(list)
      })
      .catch(() => {
        if (!cancelled) setTenants([])
      })
      .finally(() => {
        if (!cancelled) setTenantsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const menuItems = [
    {
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: <Link href={`/admin/dashboard?tenant=${currentTenantSlug || 'zxqconsulting'}`}>仪表盘</Link>,
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: <Link href={`/admin/users?tenant=${currentTenantSlug || 'zxqconsulting'}`}>用户管理</Link>,
    },
    {
      key: '/admin/profiles',
      icon: <UserOutlined />,
      label: <Link href={`/admin/profiles?tenant=${currentTenantSlug || 'zxqconsulting'}`}>用户档案</Link>,
    },
    {
      key: '/admin/leads',
      icon: <FundOutlined />,
      label: <Link href={`/admin/leads?tenant=${currentTenantSlug || 'zxqconsulting'}`}>线索评分</Link>,
    },
    {
      key: '/admin/inquiries',
      icon: <MessageOutlined />,
      label: <Link href={`/admin/inquiries?tenant=${currentTenantSlug || 'zxqconsulting'}`}>询盘管理</Link>,
    },
    {
      key: '/admin/modules',
      icon: <AppstoreOutlined />,
      label: <Link href={`/admin/modules?tenant=${currentTenantSlug || 'zxqconsulting'}`}>模块使用</Link>,
    },
    {
      key: '/admin/content',
      icon: <BarChartOutlined />,
      label: <Link href={`/admin/content?tenant=${currentTenantSlug || 'zxqconsulting'}`}>内容热度</Link>,
    },
    {
      key: '/admin/rfm',
      icon: <FundOutlined />,
      label: <Link href={`/admin/rfm?tenant=${currentTenantSlug || 'zxqconsulting'}`}>RFM分析</Link>,
    },
    {
      key: '/admin/analytics',
      icon: <BarChartOutlined />,
      label: <Link href={`/admin/analytics?tenant=${currentTenantSlug || 'zxqconsulting'}`}>数据分析</Link>,
    },
    {
      key: '/admin/analytics/attribution',
      icon: <FundOutlined />,
      label: <Link href={`/admin/analytics/attribution?tenant=${currentTenantSlug || 'zxqconsulting'}`}>归因分析</Link>,
    },
    {
      key: '/admin/funnel',
      icon: <FundOutlined />,
      label: <Link href={`/admin/funnel?tenant=${currentTenantSlug || 'zxqconsulting'}`}>转化漏斗</Link>,
    },
    {
      key: '/admin/reports',
      icon: <FileTextOutlined />,
      label: <Link href={`/admin/reports?tenant=${currentTenantSlug || 'zxqconsulting'}`}>自动化报告</Link>,
    },
    {
      key: '/admin/tools',
      icon: <ToolOutlined />,
      label: <Link href={`/admin/tools?tenant=${currentTenantSlug || 'zxqconsulting'}`}>工具数据</Link>,
    },
    {
      key: '/admin/chat',
      icon: <MessageOutlined />,
      label: <Link href={`/admin/chat?tenant=${currentTenantSlug || 'zxqconsulting'}`}>聊天记录</Link>,
    },
    {
      key: '/admin/visitor-profile',
      icon: <TeamOutlined />,
      label: <Link href={`/admin/visitor-profile?tenant=${currentTenantSlug || 'zxqconsulting'}`}>访客画像</Link>,
    },
    {
      key: '/admin/sites',
      icon: <AppstoreOutlined />,
      label: <Link href="/admin/sites">多网站管理</Link>,
    },
    {
      key: '/admin/settings',
      icon: <SettingOutlined />,
      label: <Link href={`/admin/settings?tenant=${currentTenantSlug || 'zxqconsulting'}`}>系统设置</Link>,
    },
  ]

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ]

  // 动态样式
  const isDark = mode === 'dark'
  // 使用符合 WCAG 对比度标准的颜色
  const headerBg = isDark ? '#1f2937' : '#ffffff'
  const contentBg = isDark ? '#111827' : '#f3f4f6'
  const cardBg = isDark ? '#1f2937' : '#ffffff'
  const textPrimary = isDark ? '#f3f4f6' : '#111827'   // 主文字 - 高对比度
  const textSecondary = isDark ? '#9ca3af' : '#6b7280'  // 次要文字 - 适中对比度
  const borderColor = isDark ? '#374151' : '#e5e7eb'    // 边框

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: isDark 
            ? 'linear-gradient(180deg, #111827 0%, #1f2937 100%)'
            : 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {collapsed ? (
            <span style={{ 
              color: '#fff', 
              fontSize: 22, 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>ZT</span>
          ) : (
            <span style={{ 
              color: '#fff', 
              fontSize: 15, 
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>数据</span>管理系统
            </span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['/admin/dashboard']}
          items={menuItems}
          style={{
            background: 'transparent',
            borderRight: 0,
            marginTop: 8,
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: headerBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
            borderBottom: `1px solid ${borderColor}`,
            transition: 'all 0.3s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ 
                fontSize: 16,
                color: textSecondary,
              }}
            />
            <span style={{ 
              color: textSecondary, 
              fontSize: 14,
              paddingLeft: 8,
              borderLeft: `2px solid ${isDark ? '#3730a3' : '#e2e8f0'}`,
            }}>
              {selectedTenant?.name || '选择站点'}
            </span>
          </div>
          <Space>
            {/* 全局搜索 */}
            <GlobalSearch tenantSlug={currentTenantSlug} />
            {/* 主题切换 */}
            <ThemeToggle />
            {/* 租户切换 */}
            <Dropdown
              menu={{
                items: tenants.map(t => ({
                  key: t.slug,
                  icon: <GlobalOutlined />,
                  label: t.name,
                })),
                onClick: ({ key }) => {
                  const currentPath = window.location.pathname
                  const url = new URL(currentPath, window.location.origin)
                  url.searchParams.set('tenant', key)
                  router.push(url.toString())
                },
              }}
              disabled={tenantsLoading || tenants.length === 0}
            >
              <Button 
                icon={<GlobalOutlined />} 
                loading={tenantsLoading}
                style={{
                  borderColor: isDark ? '#3730a3' : '#6366f1',
                  color: isDark ? '#818cf8' : '#6366f1',
                }}
              >
                {tenantsLoading ? '加载中...' : (selectedTenant?.name || (tenants.length === 0 ? '暂无站点' : '选择站点'))}
              </Button>
            </Dropdown>
            {/* 用户菜单 */}
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: ({ key }) => {
                  if (key === 'logout') {
                    localStorage.removeItem('admin_auth')
                    window.location.reload()
                  }
                },
              }}
            >
              <Space style={{ cursor: 'pointer', color: textPrimary }}>
                <Avatar 
                  style={{ 
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  }}
                >
                  A
                </Avatar>
                <span style={{ fontWeight: 500 }}>管理员</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: contentBg,
            borderRadius: 12,
            minHeight: 280,
            border: `1px solid ${borderColor}`,
            transition: 'all 0.3s',
          }}
        >
          {children}
        </Content>
      </Layout>
      <VoiceCommandPanel />
      <AIAssistant visible={false} />
    </Layout>
  )
}
