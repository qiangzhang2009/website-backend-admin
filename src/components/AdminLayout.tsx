/**
 * 后台管理系统布局
 * 包含侧边栏、头部和租户切换
 */

'use client'

import { useState } from 'react'
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
import { useRouter } from 'next/navigation'

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
  const [selectedTenant, setSelectedTenant] = useState<Tenant>({
    id: 'tenant_001',
    name: '张小强企业咨询',
    slug: 'zxqconsulting',
  })
  const router = useRouter()

  const menuItems = [
    {
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/admin/dashboard">仪表盘</Link>,
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: <Link href="/admin/users">用户管理</Link>,
    },
    {
      key: '/admin/leads',
      icon: <FundOutlined />,
      label: <Link href="/admin/leads">线索评分</Link>,
    },
    {
      key: '/admin/inquiries',
      icon: <MessageOutlined />,
      label: <Link href="/admin/inquiries">询盘管理</Link>,
    },
    {
      key: '/admin/analytics',
      icon: <BarChartOutlined />,
      label: <Link href="/admin/analytics">数据分析</Link>,
    },
    {
      key: '/admin/analytics/attribution',
      icon: <FundOutlined />,
      label: <Link href="/admin/analytics/attribution">归因分析</Link>,
    },
    {
      key: '/admin/tools',
      icon: <ToolOutlined />,
      label: <Link href="/admin/tools">工具数据</Link>,
    },
    {
      key: '/admin/sites',
      icon: <AppstoreOutlined />,
      label: <Link href="/admin/sites">多网站管理</Link>,
    },
    {
      key: '/admin/settings',
      icon: <SettingOutlined />,
      label: <Link href="/admin/settings">系统设置</Link>,
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
            {/* 租户切换 */}
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'zxqconsulting',
                    icon: <GlobalOutlined />,
                    label: '张小强企业咨询',
                  },
                  {
                    key: 'demo',
                    icon: <GlobalOutlined />,
                    label: '演示站点',
                  },
                ],
                onClick: ({ key }) => {
                  setSelectedTenant({
                    slug: key,
                    name: key === 'zxqconsulting' ? '张小强企业咨询' : '演示站点',
                  })
                },
              }}
            >
              <Button icon={<GlobalOutlined />}>
                {selectedTenant?.name || '选择站点'}
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
