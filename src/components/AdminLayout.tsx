/**
 * 后台管理系统布局
 * 包含侧边栏、头部和租户切换（租户列表来自 /api/admin/sites）
 */

'use client'

import { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button, Space } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
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
} from '@ant-design/icons'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

const { Header, Sider, Content } = Layout

interface Tenant {
  id?: string
  name: string
  slug: string
}

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantsLoading, setTenantsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

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
      key: '/admin/tools',
      icon: <ToolOutlined />,
      label: <Link href={`/admin/tools?tenant=${currentTenantSlug || 'zxqconsulting'}`}>工具数据</Link>,
    },
    {
      key: '/admin/chat',
      icon: <MessageOutlined />,
      label: <Link href={`/admin/chat?tenant=${currentTenantSlug || 'zero'}`}>聊天记录</Link>,
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
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
            <span style={{ color: '#fff', fontSize: 20 }}>ZT</span>
          ) : (
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
              数据管理系统
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
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16 }}
          />
          <Space>
            {/* 租户切换：从 /api/admin/sites 加载真实租户列表，通过 URL 参数 tenant 传递 */}
            <Dropdown
              menu={{
                items: tenants.map(t => ({
                  key: t.slug,
                  icon: <GlobalOutlined />,
                  label: t.name,
                })),
                onClick: ({ key }) => {
                  // 切换租户时更新 URL 参数
                  const currentPath = window.location.pathname
                  const url = new URL(currentPath, window.location.origin)
                  url.searchParams.set('tenant', key)
                  router.push(url.toString())
                },
              }}
              disabled={tenantsLoading || tenants.length === 0}
            >
              <Button icon={<GlobalOutlined />} loading={tenantsLoading}>
                {tenantsLoading ? '加载中...' : (selectedTenant?.name || (tenants.length === 0 ? '暂无站点' : '选择站点'))}
              </Button>
            </Dropdown>
            {/* 用户菜单 */}
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: ({ key }) => {
                  if (key === 'logout') {
                    router.push('/admin/login')
                  }
                },
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#1890ff' }}>A</Avatar>
                <span>管理员</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
